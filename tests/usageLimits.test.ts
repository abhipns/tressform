import { describe, expect, it } from "vitest";
import { DAILY_LIMITS, LIMIT_MESSAGES, overLimit, takeDailyUse } from "../lib/usageLimits";

/** A tiny stand-in for the Supabase admin client: just enough for takeDailyUse. */
function fakeAdmin(opts: { role?: string; used: number }) {
  const inserted: unknown[] = [];
  const chain = (result: unknown) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "gte"]) q[m] = () => q;
    q.maybeSingle = async () => result;
    q.then = (resolve: (v: unknown) => void) => resolve(result);
    return q;
  };
  return {
    inserted,
    from(table: string) {
      if (table === "profiles") return chain({ data: { role: opts.role ?? "USER" } });
      return {
        ...chain({ count: opts.used, error: null }),
        insert: async (row: unknown) => {
          inserted.push(row);
          return { error: null };
        },
      };
    },
  };
}

describe("daily AI limits", () => {
  it("has the agreed limits", () => {
    expect(DAILY_LIMITS).toEqual({ photo_read: 10, background: 10, failed_pictures: 4 });
  });

  it("blocks at the limit, not before", () => {
    expect(overLimit("photo_read", 9)).toBe(false);
    expect(overLimit("photo_read", 10)).toBe(true);
    expect(overLimit("failed_pictures", 3)).toBe(false);
    expect(overLimit("failed_pictures", 4)).toBe(true);
  });

  it("lets a customer under the limit through and logs the use", async () => {
    const admin = fakeAdmin({ used: 3 });
    await expect(takeDailyUse(admin, "background", "user-1")).resolves.toBeNull();
    expect(admin.inserted).toEqual([{ job: "usage:background", summary: { user: "user-1" } }]);
  });

  it("stops a customer at the limit without logging", async () => {
    const admin = fakeAdmin({ used: 10 });
    await expect(takeDailyUse(admin, "photo_read", "user-1")).resolves.toBe(LIMIT_MESSAGES.photo_read);
    expect(admin.inserted).toEqual([]);
  });

  it("never limits the site owner", async () => {
    const admin = fakeAdmin({ role: "ADMIN", used: 500 });
    await expect(takeDailyUse(admin, "photo_read", "owner")).resolves.toBeNull();
  });
});

// 23.10.2026: visitors who haven't signed in yet (anonymous accounts).
import { ANON_DAILY_TOTAL, ANON_LIMITS, ANON_MESSAGES } from "../lib/usageLimits";

/** Counts depend on the filters: per network address, or all anonymous uses. */
function fakeAnonAdmin(opts: { perIp: number; total: number }) {
  const inserted: { job: string; summary: Record<string, unknown> }[] = [];
  return {
    inserted,
    from() {
      const filters: Record<string, unknown> = {};
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.gte = () => q;
      q.eq = (k: string, v: unknown) => {
        filters[k] = v;
        return q;
      };
      q.then = (resolve: (v: unknown) => void) =>
        resolve({ count: filters["job"] === "anon_ceiling_alert" ? 1 : filters["summary->>ip"] ? opts.perIp : opts.total, error: null });
      q.insert = async (row: { job: string; summary: Record<string, unknown> }) => {
        inserted.push(row);
        return { error: null };
      };
      return q;
    },
  };
}

describe("limits before signing in", () => {
  it("has small per-visitor limits and a daily ceiling", () => {
    expect(ANON_LIMITS).toEqual({ photo_read: 3, background: 3 });
    expect(ANON_DAILY_TOTAL).toBe(300);
  });

  it("lets a new visitor through and logs the use against their network address", async () => {
    const admin = fakeAnonAdmin({ perIp: 0, total: 10 });
    await expect(takeDailyUse(admin, "photo_read", "anon-1", { anonymous: true, ip: "abc" })).resolves.toBeNull();
    expect(admin.inserted).toEqual([{ job: "usage:photo_read", summary: { user: "anon-1", ip: "abc", anon: true } }]);
  });

  it("asks a visitor to sign in after a few photos, even from a fresh anonymous account", async () => {
    const admin = fakeAnonAdmin({ perIp: 3, total: 10 });
    await expect(takeDailyUse(admin, "photo_read", "anon-2", { anonymous: true, ip: "abc" })).resolves.toBe(ANON_MESSAGES.perVisitor);
    expect(admin.inserted).toEqual([]);
  });

  it("asks everyone to sign in once the day's ceiling is reached", async () => {
    const admin = fakeAnonAdmin({ perIp: 0, total: 300 });
    await expect(takeDailyUse(admin, "photo_read", "anon-3", { anonymous: true, ip: "xyz" })).resolves.toBe(ANON_MESSAGES.total);
    expect(admin.inserted.filter((r) => r.job.startsWith("usage:"))).toEqual([]);
  });

  it("keeps the normal per-account limits once signed in", async () => {
    const admin = fakeAdmin({ used: 3 });
    await expect(takeDailyUse(admin, "photo_read", "user-9", { anonymous: false })).resolves.toBeNull();
  });
});

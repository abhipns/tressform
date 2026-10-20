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

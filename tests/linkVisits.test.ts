import { describe, expect, it } from "vitest";
import { LINK_REWARD_PAISE, REFERRAL_ANNUAL_CAP_PAISE, linkRewardsDue } from "../lib/pricing";
import { indiaDayStart, linkProgressLine, recordLinkVisit, type LinkVisitStore } from "../lib/linkVisits";
import { topSharers } from "../lib/stats";

/** An in-memory store with the same uniqueness rules as the database tables. */
function memoryStore(opts: { hasPaid?: boolean; creditsThisFY?: number } = {}) {
  const visits = new Map<string, string>(); // code:visitor -> first_seen
  const rewards = new Map<string, number>(); // code:milestone -> paise
  const devices = new Set<string>(["owner:owner-device-1"]);
  const balance = { owner: 0 };
  const store: LinkVisitStore = {
    async referrerOf(code) {
      return code === "abc1234567" ? { userId: "owner", hasPaid: opts.hasPaid ?? true } : null;
    },
    async isSharerDevice(userId, visitor) {
      return devices.has(`${userId}:${visitor}`);
    },
    async newVisitorsSince(code, since) {
      return [...visits.entries()].filter(([k, t]) => k.startsWith(code + ":") && t >= since).length;
    },
    async addVisitor(code, visitor) {
      const k = `${code}:${visitor}`;
      if (visits.has(k)) return false;
      visits.set(k, new Date().toISOString());
      return true;
    },
    async visitorCount(code) {
      return [...visits.keys()].filter((k) => k.startsWith(code + ":")).length;
    },
    async paidMilestones(code) {
      return [...rewards.keys()].filter((k) => k.startsWith(code + ":")).map((k) => Number(k.split(":")[1]));
    },
    async creditsSince() {
      return (opts.creditsThisFY ?? 0) + [...rewards.values()].reduce((s, p) => s + p, 0);
    },
    async recordReward(code, _u, milestone, _v, paise) {
      const k = `${code}:${milestone}`;
      if (rewards.has(k)) return false;
      rewards.set(k, paise);
      return true;
    },
    async addCredit(_u, paise) {
      balance.owner += paise;
    },
  };
  return { store, visits, rewards, balance };
}

const visit = (store: LinkVisitStore, visitor: string, signedInUserId: string | null = null) =>
  recordLinkVisit(store, { code: "abc1234567", visitor, signedInUserId });

describe("counting link visitors (26.10.2026)", () => {
  it("counts each visitor once per code", async () => {
    const { store } = memoryStore();
    expect(await visit(store, "visitor-0001")).toMatchObject({ counted: true, visitors: 1 });
    expect(await visit(store, "visitor-0001")).toEqual({ counted: false, reason: "seen_before" });
  });

  it("never counts the customer's own visits", async () => {
    const { store } = memoryStore();
    expect(await visit(store, "visitor-0002", "owner")).toEqual({ counted: false, reason: "own_visit" });
    expect(await visit(store, "owner-device-1")).toEqual({ counted: false, reason: "own_visit" });
  });

  it("only accounts that have paid at least once earn", async () => {
    const { store } = memoryStore({ hasPaid: false });
    expect(await visit(store, "visitor-0003")).toEqual({ counted: false, reason: "not_paid_yet" });
  });

  it("ignores unknown codes and missing or malformed visitor ids", async () => {
    const { store } = memoryStore();
    expect(await recordLinkVisit(store, { code: "nobody0000", visitor: "visitor-0004", signedInUserId: null })).toEqual({
      counted: false,
      reason: "unknown_code",
    });
    expect(await recordLinkVisit(store, { code: "abc1234567", visitor: null, signedInUserId: null })).toMatchObject({ reason: "bad_input" });
    expect(await recordLinkVisit(store, { code: "abc1234567", visitor: "<script>", signedInUserId: null })).toMatchObject({ reason: "bad_input" });
  });

  it("counts at most 100 new visitors per code per day", async () => {
    const { store } = memoryStore();
    for (let i = 0; i < 100; i++) expect((await visit(store, `visitor-${String(i).padStart(4, "0")}`)).counted).toBe(true);
    expect(await visit(store, "visitor-0100")).toEqual({ counted: false, reason: "daily_limit" });
  });

  it("starts the day at midnight in India", () => {
    // 26 Oct 2026, 01:00 in India = 25 Oct 19:30 UTC → the day started 25 Oct 18:30 UTC.
    expect(indiaDayStart(new Date("2026-10-25T19:30:00Z")).toISOString()).toBe("2026-10-25T18:30:00.000Z");
  });
});

describe("paying ₹10 for every 10 visitors", () => {
  it("pays ₹10 at 10, 20, 30 visitors — and never twice", async () => {
    const { store, balance } = memoryStore();
    const paidAt: number[] = [];
    for (let i = 1; i <= 30; i++) {
      const r = await visit(store, `visitor-${String(i).padStart(4, "0")}`);
      if (r.counted && r.creditedPaise > 0) paidAt.push(r.visitors);
    }
    expect(paidAt).toEqual([10, 20, 30]);
    expect(balance.owner).toBe(3 * LINK_REWARD_PAISE);
  });

  it("works out what is due, skipping milestones already paid", () => {
    expect(linkRewardsDue(9, [], 0)).toEqual([]);
    expect(linkRewardsDue(10, [], 0)).toEqual([{ milestone: 1, paise: 1000 }]);
    expect(linkRewardsDue(35, [1, 2], 0)).toEqual([{ milestone: 3, paise: 1000 }]);
  });

  it("counts toward the ₹15,000 yearly cap", () => {
    expect(linkRewardsDue(10, [], REFERRAL_ANNUAL_CAP_PAISE - 400)).toEqual([{ milestone: 1, paise: 400 }]);
    expect(linkRewardsDue(20, [], REFERRAL_ANNUAL_CAP_PAISE)).toEqual([
      { milestone: 1, paise: 0 },
      { milestone: 2, paise: 0 },
    ]);
  });

  it("stops paying once the cap is reached", async () => {
    const { store, balance } = memoryStore({ creditsThisFY: REFERRAL_ANNUAL_CAP_PAISE - 500 });
    for (let i = 1; i <= 20; i++) await visit(store, `visitor-${String(i).padStart(4, "0")}`);
    expect(balance.owner).toBe(500);
  });
});

describe("what the customer and owner see", () => {
  it("shows progress toward the next ₹10", () => {
    expect(linkProgressLine(7, 3000)).toBe("7 of 10 visitors — ₹10 credit when you reach 10. Earned so far: ₹30");
    expect(linkProgressLine(27, 2000)).toBe("7 of 10 visitors — ₹10 credit when you reach 30. Earned so far: ₹20");
    expect(linkProgressLine(0, 0)).toBe("0 of 10 visitors — ₹10 credit when you reach 10. Earned so far: ₹0");
  });

  it("lists top sharers by visitors brought", () => {
    const rows = topSharers(
      [{ code: "a" }, { code: "b" }, { code: "b" }],
      [{ code: "b", credits_paise: 1000 }]
    );
    expect(rows).toEqual([
      { code: "b", visitors: 2, creditPaise: 1000 },
      { code: "a", visitors: 1, creditPaise: 0 },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { averageOf, readReview, shownName } from "../lib/reviews";
import { monthStart, periodStart, stepRate } from "../lib/stats";

describe("reviews", () => {
  it("accepts 1 to 5 stars for a known section", () => {
    const r = readReview({ section: "list", rating: 4, comment: "  Great list  ", displayName: " Abhi " });
    expect(r).toEqual({ ok: true, review: { section: "list", rating: 4, comment: "Great list", displayName: "Abhi" } });
  });
  it("refuses a bad rating or section", () => {
    expect(readReview({ section: "list", rating: 6 }).ok).toBe(false);
    expect(readReview({ section: "list", rating: 2.5 }).ok).toBe(false);
    expect(readReview({ section: "other", rating: 3 }).ok).toBe(false);
  });
  it("shows the typed name, else the first name, else a plain label", () => {
    expect(shownName("Riya", "Riya Sharma")).toBe("Riya");
    expect(shownName(null, "Abhishek Sharma")).toBe("Abhishek");
    expect(shownName(null, null)).toBe("A Tressform customer");
  });
  it("averages every rating, low ones included", () => {
    expect(averageOf([5, 4, 1])).toEqual({ avg: 3.3, count: 3 });
    expect(averageOf([])).toEqual({ avg: null, count: 0 });
  });
});

describe("dashboard", () => {
  it("starts 'today' at midnight in India", () => {
    // 13 Oct 2026, 17:00 IST = 11:30 UTC → midnight IST = 12 Oct 18:30 UTC
    expect(periodStart("today", new Date("2026-10-13T11:30:00Z"))).toBe("2026-10-12T18:30:00.000Z");
    // 13 Oct 2026, 01:00 IST = 12 Oct 19:30 UTC → still 13 Oct in India
    expect(periodStart("today", new Date("2026-10-12T19:30:00Z"))).toBe("2026-10-12T18:30:00.000Z");
  });
  it("counts back whole days for 7 and 30", () => {
    expect(periodStart("7", new Date("2026-10-13T00:00:00Z"))).toBe("2026-10-06T00:00:00.000Z");
  });
  it("gives each funnel step's share of the one before", () => {
    expect(stepRate(25, 100)).toBe(25);
    expect(stepRate(3, 0)).toBeNull();
  });
  it("reads a month", () => {
    expect(monthStart("2026-10")).toBe("2026-10-01");
    expect(monthStart("2026-13")).toBeNull();
  });
});

import { committedCost } from "../lib/stats";

describe("AI cost still to come", () => {
  it("counts 3 pictures per unopened look and 4 per look not made yet", () => {
    expect(committedCost(2, 1, 350)).toEqual({ unopenedLooks: 2, unmadeLooks: 1, paise: (2 * 3 + 1 * 4) * 350 });
  });
  it("is zero with nothing outstanding and never negative", () => {
    expect(committedCost(0, 0, 350).paise).toBe(0);
    expect(committedCost(-3, -1, 350).paise).toBe(0);
  });
});

import { finalSummary } from "../lib/stats";

describe("final summary", () => {
  const base = { salesPaise: 19_900, affiliatePaise: 0, feesPaise: 470, aiCostPaise: 5_600, committedPaise: 0, gstPaise: 0, taxRatePct: 30 };
  it("takes every known cost off, then the owner's tax rate on what's left", () => {
    const r = finalSummary(base);
    expect(r.profitBeforeTaxPaise).toBe(13_830);
    expect(r.incomeTaxPaise).toBe(4_149);
    expect(r.takeHomePaise).toBe(13_830 - 4_149);
  });
  it("counts GST and AI cost still to come as costs", () => {
    expect(finalSummary({ ...base, gstPaise: 3_036, committedPaise: 1_050, taxRatePct: 0 }).takeHomePaise).toBe(13_830 - 3_036 - 1_050);
  });
  it("charges no income tax on a loss, and keeps the rate between 0 and 100", () => {
    expect(finalSummary({ ...base, salesPaise: 0 }).incomeTaxPaise).toBe(0);
    expect(finalSummary({ ...base, taxRatePct: 250 }).incomeTaxPaise).toBe(13_830);
    expect(finalSummary({ ...base, taxRatePct: NaN }).incomeTaxPaise).toBe(0);
  });
});

import { shouldCountVisit } from "../lib/stats";

describe("visit counter limits", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
  it("counts a first visit and a different page", () => {
    expect(shouldCountVisit("/", [], now)).toBe(true);
    expect(shouldCountVisit("/refer", [{ path: "/", created_at: ago(1) }], now)).toBe(true);
  });
  it("counts the same page once per half hour", () => {
    expect(shouldCountVisit("/", [{ path: "/", created_at: ago(10) }], now)).toBe(false);
    expect(shouldCountVisit("/", [{ path: "/", created_at: ago(45) }], now)).toBe(true);
  });
  it("stops at 60 pages a day for one visitor", () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ path: `/p${i}`, created_at: ago(60 + i) }));
    expect(shouldCountVisit("/new", many, now)).toBe(false);
  });
});

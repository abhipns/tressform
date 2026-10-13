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

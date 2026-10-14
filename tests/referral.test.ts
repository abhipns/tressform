import { describe, expect, it } from "vitest";
import { decideClaim, financialYearStart, normalizeReferralCode, referralLink } from "../lib/referral";

const base = { claimantId: "friend", referrerId: "me", claimantAlreadyReferredBy: null, claimantHasPaidOrder: false };

describe("referral codes and links", () => {
  it("accepts real 10-character codes and demo codes, tidying case and spaces", () => {
    expect(normalizeReferralCode(" A1B2C3D4E5 ")).toBe("a1b2c3d4e5");
    expect(normalizeReferralCode("mock_ab12cd34")).toBe("mock_ab12cd34");
  });
  it("refuses anything that can't be a code", () => {
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode("abc")).toBeNull();
    expect(normalizeReferralCode("a1b2<script>")).toBeNull();
    expect(normalizeReferralCode(42)).toBeNull();
    expect(normalizeReferralCode("x".repeat(25))).toBeNull();
  });
  it("builds the share link", () => {
    expect(referralLink("a1b2c3d4e5")).toBe("https://tressform.co.in/?ref=a1b2c3d4e5");
    expect(referralLink("a1b2c3d4e5", "http://localhost:3000/")).toBe("http://localhost:3000/?ref=a1b2c3d4e5");
  });
});

describe("who can be linked (owner's rule: anyone who has never paid)", () => {
  it("links a friend who has never paid, however old their account", () => {
    expect(decideClaim(base)).toEqual({ ok: true });
  });
  it("refuses a code nobody has", () => {
    expect(decideClaim({ ...base, referrerId: null })).toEqual({ ok: false, reason: "unknown_code" });
  });
  it("refuses someone's own link", () => {
    expect(decideClaim({ ...base, referrerId: "friend" })).toEqual({ ok: false, reason: "own_code" });
  });
  it("keeps the first link: an already-linked friend can't be re-linked", () => {
    expect(decideClaim({ ...base, claimantAlreadyReferredBy: "someone-else" })).toEqual({ ok: false, reason: "already_referred" });
  });
  it("refuses a friend who has already paid before", () => {
    expect(decideClaim({ ...base, claimantHasPaidOrder: true })).toEqual({ ok: false, reason: "already_paid" });
  });
});

describe("financial year for the ₹15,000 cap (India time)", () => {
  it("April onwards belongs to the year starting that April", () => {
    expect(financialYearStart(new Date("2026-10-14T09:00:00Z")).toISOString()).toBe("2026-03-31T18:30:00.000Z");
  });
  it("January to March belongs to the year that started the previous April", () => {
    expect(financialYearStart(new Date("2027-03-31T12:00:00Z")).toISOString()).toBe("2026-03-31T18:30:00.000Z");
  });
  it("uses India's clock at the boundary: 1 April 00:30 IST is already the new year", () => {
    // 31 March 19:00 UTC = 1 April 00:30 in India.
    expect(financialYearStart(new Date("2027-03-31T19:00:00Z")).toISOString()).toBe("2027-03-31T18:30:00.000Z");
  });
});

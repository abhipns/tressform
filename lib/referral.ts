// Tressform — referral link rules (14.10.2026, owner's request).
//
// How a referral works end to end:
//   1. Every account already has a referral code (profiles.referral_code,
//      10 letters/digits made by the database). Its link is
//      tressform.co.in/?ref=<code>.
//   2. A friend opens the link: components/ReferralBeacon.tsx keeps the code
//      on that device.
//   3. Once the friend is signed in (new or existing account), the beacon
//      sends the code to /api/referral/claim, which links the two accounts
//      using the rules in decideClaim() below.
//   4. When the friend pays for the first time, lib/payments.ts
//      (settleReferral) credits the referrer — already built.
//
// Owner's rule (14.10.2026): a "new customer" is anyone who has never paid,
// however old their account is. So the only check on the friend is "no
// paid order yet"; how long ago they signed up doesn't matter.
//
// Pure functions only — no database — so the rules can be tested directly.

/** Real codes are 10 lowercase hex characters; demo-mode codes look like "mock_ab12cd34". */
const CODE_PATTERN = /^[a-z0-9_]{6,24}$/;

/** Tidy a code from a link, or null if it can't be a code at all. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export function referralLink(code: string, origin = "https://tressform.co.in"): string {
  return `${origin.replace(/\/+$/, "")}/?ref=${encodeURIComponent(code)}`;
}

export type ClaimReason =
  | "unknown_code" // no account has this code
  | "own_code" // the friend opened their own link
  | "already_referred" // the friend is already linked to someone (first link wins)
  | "already_paid"; // the friend has paid before, so isn't a new customer

export type ClaimDecision = { ok: true } | { ok: false; reason: ClaimReason };

/**
 * Whether this signed-in customer can be linked to the owner of the code.
 * Every "no" is final: the same code will never succeed later for this
 * customer, so the browser can forget it.
 */
export function decideClaim(input: {
  claimantId: string;
  referrerId: string | null;
  claimantAlreadyReferredBy: string | null;
  claimantHasPaidOrder: boolean;
}): ClaimDecision {
  if (!input.referrerId) return { ok: false, reason: "unknown_code" };
  if (input.referrerId === input.claimantId) return { ok: false, reason: "own_code" };
  if (input.claimantAlreadyReferredBy) return { ok: false, reason: "already_referred" };
  if (input.claimantHasPaidOrder) return { ok: false, reason: "already_paid" };
  return { ok: true };
}

/**
 * Start of the Indian financial year (1 April, India time) that `now` falls
 * in, as a UTC instant. Used for the ₹15,000-per-year referral cap.
 */
export function financialYearStart(now: Date = new Date()): Date {
  const IST_OFFSET_MS = 330 * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS); // read the UTC fields as India's calendar
  const year = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 3, 1) - IST_OFFSET_MS); // 1 April 00:00 India time
}

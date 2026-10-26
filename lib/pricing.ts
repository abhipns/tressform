// Tressform — pricing, GST, generation-cost, and referral business logic.
//
// This module is the single source of truth for the P&L math in spec Part I,
// and MUST match that table exactly. All money is handled as integer paise
// (₹1 = 100 paise) to avoid floating-point drift; each intermediate is
// rounded to the nearest paise the same way the spec's rupee table rounds to
// the nearest paisa, so results match to the rupee-and-paise.
//
// Methodology (Part I):
//   1. Price is GST-inclusive. GST payable to govt = price × 18/118.
//      (Only once the business is GST-registered — see GST_REGISTERED.)
//   2. Generation cost = image count × ₹3.50 × 1.2 (20% buffer for retries)
//      = image count × ₹4.20/image.
//   3. Payment gateway fee ≈ 2.36% of price.
//   4. Profit before referral = price − GST − generation cost − gateway fee.
//   5. Referral reward (resolved 21.09.2026, doc thread ef02f07b — supersedes
//      the earlier "10% of profit" rule): a FLAT credit amount, keyed by
//      which tier pack the referred customer's first purchase ever was —
//      Starter Pack = 2,000 credits-paise (₹20), Style Pack = ₹40, Full
//      Explore = ₹100 (1 credit = ₹1). Paid once, only when that very first
//      purchase is a tier pack — a My Assets add-on-only first purchase
//      earns the referrer nothing, even though it's still "first purchase"
//      for record-keeping. Never paid again on that customer's later
//      purchases. Credits are non-withdrawable: redeemable only at partner
//      salons or for more generations on Tressform, never cashed out — see
//      REFERRAL_CREDITS_BY_TIER_PAISE below, not a percentage of profit.

// THE FREE-PREVIEW SWITCH (11.10.2026). While true, a new account's first
// previews are free, up to the limit on its profile (2).
//
// Switched OFF the same night, on the owner's instruction after his first
// run as a customer: "we were not supposed to create images and show the
// hairstyles unless the customer pays". So: reading the photo and the list
// of matched hairstyles are free; every picture comes from a paid pack.
// The site's wording says the same (Hero, upload section, Pricing, FAQ,
// Terms, Privacy). The one exception is the owner's own account, which
// keeps its small test allowance so the site can still be tried end to end
// (lib/allowance.ts).
export const FREE_PREVIEWS_ON: boolean = false;

export type PackTier = "STARTER" | "STYLE" | "FULL_EXPLORE";
export type AddonKind = "BACKGROUND" | "OUTFIT";

// 10.10.2026: Tressform is not GST-registered yet, so it must not charge
// GST or say that a price "includes GST". While this is false, the GST
// component of every order is 0 and the site shows plain prices. On
// registration: set this to true and put the number in lib/business.ts —
// the "(GST incl.)" wording and the GST line at checkout come back by
// themselves.
export const GST_REGISTERED: boolean = false;
export const GST_RATE = 18 / 118; // extraction rate for GST-inclusive pricing
export const GENERATION_COST_PER_IMAGE_PAISE = 350; // ₹3.50, see Part H
/** 12.10.2026: a paid preview is four pictures — front, left side, right side, back. */
export const PICTURES_PER_PREVIEW = 4;
export const GENERATION_BUFFER_MULTIPLIER = 1.2; // 20% buffer, see comment on Part H
export const GATEWAY_FEE_RATE = 0.0236; // ≈2.36% of price

/**
 * Flat referral credit awarded (in paise-equivalent, non-cash) when a
 * referred customer's first-ever purchase is this tier. Not indexed by
 * price, so it doesn't move if Early Bird pricing changes — it's a fixed
 * reward amount decided separately from the P&L math above.
 */
export const REFERRAL_CREDITS_BY_TIER_PAISE: Record<PackTier, number> = {
  STARTER: 2_000, // ₹20 in credits
  STYLE: 4_000, // ₹40 in credits
  FULL_EXPLORE: 10_000, // ₹100 in credits
};

// ---------------------------------------------------------------------------
// Annual referral cap (resolved 21.09.2026, doc thread d7f981de): ₹15,000 /
// 15,000 credits per referrer account per Indian financial year (1 Apr–31
// Mar). Once a referrer's total credits earned in a financial year hit this
// cap, further referrals in that year earn nothing until the next FY resets
// the counter. Deliberately set below REFERRAL_TDS_THRESHOLD_PAISE (₹20,000)
// so a single referrer's credits shouldn't cross into TDS territory under
// normal use — the TDS logic further down is kept as a backend safety net
// (account merges, multiple referral codes per person, etc.), not expected
// to trigger once this cap is enforced.
// ---------------------------------------------------------------------------
export const REFERRAL_ANNUAL_CAP_PAISE = 15_000_00; // ₹15,000/FY per referrer

/** Start of the Indian financial year (1 Apr) containing `date`. FYs run Apr–Mar. */
export function financialYearStart(date: Date = new Date()): Date {
  const year = date.getUTCMonth() >= 3 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 3, 1)); // 1 Apr, UTC — good enough for a year-boundary check, not to-the-second IST precision
}

/**
 * The referral credit actually payable, after applying the ₹15,000/FY cap.
 * `cumulativeCreditsThisFYPaise` is the referrer's credits already earned
 * in the current FY, BEFORE this order — pass 0 for a referrer's first
 * credit of the year. Returns less than the tier's full flat amount (or 0)
 * once the cap is reached mid-order; never negative.
 */
export function calculateReferralCreditsPaiseWithCap(
  tier: PackTier | null,
  isReferredFirstPurchase: boolean,
  cumulativeCreditsThisFYPaise: number
): number {
  const flat = calculateReferralCreditsPaise(tier, isReferredFirstPurchase);
  const remainingCapPaise = Math.max(0, REFERRAL_ANNUAL_CAP_PAISE - cumulativeCreditsThisFYPaise);
  return Math.min(flat, remainingCapPaise);
}

// ---------------------------------------------------------------------------
// Early Bird pricing (confirmed via comment on the Master Section Plan doc's
// "Unlock Your Top Matches + Pricing" row). ₹249/₹499 are the genuine
// standing prices once the window ends — ₹199/₹399 is a real, time-bound
// launch discount, not an invented reference price (resolves the
// fake-anchor-pricing / ASCI dark-pattern flag from the previous draft).
//
// The old, separate ₹399 / 10-photo "Complete Pack" tier is discarded — its
// photo count now lives inside Style Pack (2 free-tier + 8 new = 10 total),
// not as its own tier.
//
// IMPORTANT: this cutoff must also be enforced server-side in the
// checkout/pricing engine, not just here — on 1 Nov 2026 the price charged
// for any NEW purchase must switch to the regular price automatically, with
// no countdown reset and no manual override that quietly extends it past
// 31 Oct 2026, 23:59 IST. A customer who already purchased at the Early
// Bird price keeps that purchase's entitlement (photo count, GST
// breakdown) unchanged even after the price reverts — only new purchases
// are affected by the cutoff. `getCurrentPackPrice` below is the one place
// that logic should be called from on both the client and the server, so
// display and checkout can never drift apart.
export const EARLY_BIRD_CUTOFF_ISO = "2026-12-31T23:59:00+05:30"; // 31 Dec 2026, 23:59 IST (moved from 31 Oct on 12.10.2026)

export function isEarlyBirdActive(now: Date = new Date()): boolean {
  return now.getTime() <= new Date(EARLY_BIRD_CUTOFF_ISO).getTime();
}

export interface PackDefinition {
  tier: PackTier;
  label: string;
  /** The standing price once Early Bird ends. `null` = not yet set (Full Explore is Early-Bird-only for now, still locked/Coming Soon). */
  regularPricePaise: number | null;
  /** The real, time-bound launch price. */
  earlyBirdPricePaise: number;
  imageCount: number;
}

export const PACK_TIERS: Record<PackTier, PackDefinition> = {
  STARTER: { tier: "STARTER", label: "Starter Pack", regularPricePaise: 24_900, earlyBirdPricePaise: 19_900, imageCount: 4 },
  STYLE: { tier: "STYLE", label: "Style Pack", regularPricePaise: 49_900, earlyBirdPricePaise: 39_900, imageCount: 10 },
  FULL_EXPLORE: { tier: "FULL_EXPLORE", label: "Full Explore", regularPricePaise: null, earlyBirdPricePaise: 99_900, imageCount: 15 },
};

/** The price a NEW purchase of this tier should be charged right now — this is the single call site display and checkout should both use. */
export function getCurrentPackPricePaise(tier: PackTier, now: Date = new Date()): number {
  const pack = PACK_TIERS[tier];
  if (isEarlyBirdActive(now) || pack.regularPricePaise === null) return pack.earlyBirdPricePaise;
  return pack.regularPricePaise;
}

export const MY_ASSETS_ADDON_PRICE_PAISE = 2_500; // ₹25/photo (Part H)

/** Round to the nearest paisa (integer), matching how the spec's rupee table rounds to 2 decimals. */
function roundPaise(paise: number): number {
  return Math.round(paise);
}

export interface OrderPnl {
  pricePaise: number;
  gstPaise: number;
  generationCostPaise: number;
  gatewayFeePaise: number;
  profitBeforeReferralPaise: number;
}

/** Core P&L calc shared by both pack purchases and My Assets add-on purchases. */
export function calculateOrderPnl(pricePaise: number, imageCount: number, picturesEach = 1): OrderPnl {
  const gstPaise = GST_REGISTERED ? roundPaise(pricePaise * GST_RATE) : 0;
  const generationCostPaise = roundPaise(
    imageCount * picturesEach * GENERATION_COST_PER_IMAGE_PAISE * GENERATION_BUFFER_MULTIPLIER
  );
  const gatewayFeePaise = roundPaise(pricePaise * GATEWAY_FEE_RATE);
  const profitBeforeReferralPaise = pricePaise - gstPaise - generationCostPaise - gatewayFeePaise;

  return { pricePaise, gstPaise, generationCostPaise, gatewayFeePaise, profitBeforeReferralPaise };
}

/** P&L for a pack purchase (Starter / Style / Full Explore), at whatever price is currently in effect (Early Bird or regular). */
export function calculatePackPnl(tier: PackTier, now: Date = new Date()): OrderPnl {
  const pack = PACK_TIERS[tier];
  return calculateOrderPnl(getCurrentPackPricePaise(tier, now), pack.imageCount, PICTURES_PER_PREVIEW);
}

/** P&L for a My Assets add-on purchase (Background or Outfit), per photo. */
export function calculateAddonPnl(photoCount: number): OrderPnl {
  // One add-on "photo" = one generation, same ₹3.50 base cost as a pack image.
  return calculateOrderPnl(MY_ASSETS_ADDON_PRICE_PAISE * photoCount, photoCount);
}

/**
 * Referral credit, in paise-equivalent, for a given order. Flat per tier,
 * not a percentage of price or profit. Callers MUST gate this on
 * `isReferredFirstPurchase` (a referrer is only ever credited on a referred
 * customer's very first purchase ever, confirmed: buying Starter Pack then
 * later Full Explore pays referral only on the Starter Pack purchase) AND
 * pass `tier` only when the order actually included a tier pack — pass
 * `null` for an add-on-only order, which never qualifies regardless of
 * whether it's technically the customer's first purchase.
 */
export function calculateReferralCreditsPaise(tier: PackTier | null, isReferredFirstPurchase: boolean): number {
  if (!isReferredFirstPurchase || tier === null) return 0;
  return REFERRAL_CREDITS_BY_TIER_PAISE[tier];
}

export interface FullOrderCalculation extends OrderPnl {
  isReferredFirstPurchase: boolean;
  referralCreditsPaise: number;
  netProfitPaise: number; // profit after the referral credit's cost is deducted
}

export function calculateFullOrder(
  pricePaise: number,
  imageCount: number,
  tier: PackTier | null,
  isReferredFirstPurchase: boolean
): FullOrderCalculation {
  const pnl = calculateOrderPnl(pricePaise, imageCount, tier ? PICTURES_PER_PREVIEW : 1);
  const referralCreditsPaise = calculateReferralCreditsPaise(tier, isReferredFirstPurchase);
  return {
    ...pnl,
    isReferredFirstPurchase,
    referralCreditsPaise,
    netProfitPaise: pnl.profitBeforeReferralPaise - referralCreditsPaise,
  };
}

// ---------------------------------------------------------------------------
// Single pictures (26.10.2026, owner's request). Next to the packs (which are
// unchanged), a customer can buy ONE hairstyle on their own face, picture by
// picture: the front ₹25, each side and the back ₹15, or all four together
// as the "Full look" for ₹70. Views can be added later (front today, the
// back next week for ₹15). The side and back pictures are made FROM the
// front picture (lib/integrations/falai.ts, generateView), so a side or back
// can only be bought with the front or after it. Single pictures earn the
// referrer nothing — the referral rewards stay with the packs.
// ---------------------------------------------------------------------------
export type PictureView = "front" | "left" | "right" | "back";
export const PICTURE_VIEWS: PictureView[] = ["front", "left", "right", "back"];
export const PICTURE_PRICE_PAISE: Record<PictureView, number> = {
  front: 2_500, // ₹25
  left: 1_500, // ₹15
  right: 1_500, // ₹15
  back: 1_500, // ₹15
};
/** All four views bought together, before any of them is owned. */
export const FULL_LOOK_PRICE_PAISE = 7_000; // ₹70
/** Single pictures never earn referral credit. */
export const PICTURE_REFERRAL_CREDITS_PAISE = 0;
/** A paid view that fails this many times is marked for refund (/admin/orders). */
export const PICTURE_MAX_FAILURES = 3;

export type PicturePrice =
  | { ok: true; views: PictureView[]; pricePaise: number; fullLook: boolean }
  | { ok: false; error: string };

/**
 * What a customer pays for the views they ask for, given the views of the
 * same hairstyle on the same photo they already own. Owned views are left
 * out (never paid twice). The Full look price applies when all four are
 * bought at once with none owned; otherwise each view is priced on its own.
 */
export function priceForPictures(wanted: readonly string[], owned: readonly string[] = []): PicturePrice {
  const have = new Set(owned.filter((v): v is PictureView => (PICTURE_VIEWS as string[]).includes(v)));
  const views = PICTURE_VIEWS.filter((v) => wanted.includes(v) && !have.has(v));
  if (views.length === 0) {
    return { ok: false, error: wanted.length > 0 ? "You already have these pictures." : "Choose which pictures you'd like." };
  }
  if (!have.has("front") && !views.includes("front")) {
    return { ok: false, error: "The sides and back are made from the front picture, so the front comes first." };
  }
  const fullLook = have.size === 0 && views.length === PICTURE_VIEWS.length;
  const pricePaise = fullLook ? FULL_LOOK_PRICE_PAISE : views.reduce((sum, v) => sum + PICTURE_PRICE_PAISE[v], 0);
  return { ok: true, views, pricePaise, fullLook };
}

/** P&L for a single-picture order: ₹3.50 × 1.2 per picture, 2.36% gateway fee (calculateOrderPnl). */
export function calculatePicturePnl(pricePaise: number, pictureCount: number): OrderPnl {
  return calculateOrderPnl(pricePaise, pictureCount, 1);
}

// ---------------------------------------------------------------------------
// Credit for visitors a customer's link brings (26.10.2026, owner's request).
// Separate from, and on top of, the pack referral rewards above (which don't
// change): ₹10 of the same non-cash credit for every 10 different visitors
// who open the site through the customer's referral link. It counts toward
// the same ₹15,000-a-year cap. Only accounts that have paid at least once
// earn it, and at most 100 new visitors per link are counted a day. The
// counting rules are in lib/linkVisits.ts.
// ---------------------------------------------------------------------------
export const LINK_VISITORS_PER_REWARD = 10;
export const LINK_REWARD_PAISE = 1_000; // ₹10
export const LINK_NEW_VISITORS_PER_DAY = 100;

/**
 * The link rewards to pay now: one per 10 visitors reached (milestone 1 at
 * 10, 2 at 20…) that hasn't been paid yet, each ₹10, cut down to what's
 * left of the yearly cap (`creditsThisFYPaise` = credit already earned this
 * financial year, from packs and links). A milestone reached with the cap
 * used up is still recorded, at ₹0, so it is never paid later.
 */
export function linkRewardsDue(
  visitors: number,
  paidMilestones: readonly number[],
  creditsThisFYPaise: number
): { milestone: number; paise: number }[] {
  const reached = Math.floor(Math.max(0, visitors) / LINK_VISITORS_PER_REWARD);
  let room = Math.max(0, REFERRAL_ANNUAL_CAP_PAISE - creditsThisFYPaise);
  const due: { milestone: number; paise: number }[] = [];
  for (let m = 1; m <= reached; m++) {
    if (paidMilestones.includes(m)) continue;
    const paise = Math.min(LINK_REWARD_PAISE, room);
    room -= paise;
    due.push({ milestone: m, paise });
  }
  return due;
}

/** Convert paise to a ₹ display string, e.g. 14714 -> "147.14". */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

// ---------------------------------------------------------------------------
// TDS on referral rewards (Section 393, Income-tax Act 2025 — successor to
// the old Section 194H) — 2% TDS applies once a payee's referral rewards
// cross ₹20,000 in a financial year, and requires the payee's PAN on file.
//
// FLAGGED, NOT DECIDED: this was written when referral rewards were a cash
// payout. Now that rewards are non-withdrawable Tressform credits (per doc
// thread ef02f07b), whether Sec 393 TDS still applies to a non-cash,
// non-transferable in-app credit is a real open tax question — this isn't
// legal/tax advice, and the function below is kept only so the math is
// ready if a CA confirms TDS still applies (e.g. because credits still
// count as a "benefit" under Sec 194R-style benefit-in-kind rules). Get
// that confirmed with an accountant before wiring this into the actual
// payout/settlement flow — don't assume either way.
// ---------------------------------------------------------------------------
export const REFERRAL_TDS_RATE = 0.02;
export const REFERRAL_TDS_THRESHOLD_PAISE = 20_000_00; // ₹20,000/year per payee = 2,000,000 paise

export function calculateReferralTds(cumulativeCreditsThisYearPaise: number): { tdsApplies: boolean; tdsPaise: number } {
  const tdsApplies = cumulativeCreditsThisYearPaise > REFERRAL_TDS_THRESHOLD_PAISE;
  return {
    tdsApplies,
    tdsPaise: tdsApplies ? roundPaise(cumulativeCreditsThisYearPaise * REFERRAL_TDS_RATE) : 0,
  };
}

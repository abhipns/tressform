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

export type PackTier = "STARTER" | "STYLE" | "FULL_EXPLORE";
export type AddonKind = "BACKGROUND" | "OUTFIT";

export const GST_RATE = 18 / 118; // extraction rate for GST-inclusive pricing
export const GENERATION_COST_PER_IMAGE_PAISE = 350; // ₹3.50, see Part H
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
export const EARLY_BIRD_CUTOFF_ISO = "2026-10-31T23:59:00+05:30"; // 31 Oct 2026, 23:59 IST

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

export const MY_ASSETS_ADDON_PRICE_PAISE = 2_500; // ₹25/photo, GST-inclusive (Part H)

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
export function calculateOrderPnl(pricePaise: number, imageCount: number): OrderPnl {
  const gstPaise = roundPaise(pricePaise * GST_RATE);
  const generationCostPaise = roundPaise(imageCount * GENERATION_COST_PER_IMAGE_PAISE * GENERATION_BUFFER_MULTIPLIER);
  const gatewayFeePaise = roundPaise(pricePaise * GATEWAY_FEE_RATE);
  const profitBeforeReferralPaise = pricePaise - gstPaise - generationCostPaise - gatewayFeePaise;

  return { pricePaise, gstPaise, generationCostPaise, gatewayFeePaise, profitBeforeReferralPaise };
}

/** P&L for a pack purchase (Starter / Style / Full Explore), at whatever price is currently in effect (Early Bird or regular). */
export function calculatePackPnl(tier: PackTier, now: Date = new Date()): OrderPnl {
  const pack = PACK_TIERS[tier];
  return calculateOrderPnl(getCurrentPackPricePaise(tier, now), pack.imageCount);
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
  const pnl = calculateOrderPnl(pricePaise, imageCount);
  const referralCreditsPaise = calculateReferralCreditsPaise(tier, isReferredFirstPurchase);
  return {
    ...pnl,
    isReferredFirstPurchase,
    referralCreditsPaise,
    netProfitPaise: pnl.profitBeforeReferralPaise - referralCreditsPaise,
  };
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

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
//   5. Referral payout = 10% of profit before referral, and ONLY on a
//      referred customer's very first purchase ever (any tier/add-on) — not
//      on any purchase after that, even by the same customer.

export type PackTier = "STARTER" | "STYLE" | "COMPLETE" | "FULL_EXPLORE";
export type AddonKind = "BACKGROUND" | "OUTFIT";

export const GST_RATE = 18 / 118; // extraction rate for GST-inclusive pricing
export const GENERATION_COST_PER_IMAGE_PAISE = 350; // ₹3.50, see Part H
export const GENERATION_BUFFER_MULTIPLIER = 1.2; // 20% buffer, see comment on Part H
export const GATEWAY_FEE_RATE = 0.0236; // ≈2.36% of price
export const REFERRAL_PAYOUT_RATE = 0.1; // 10% of profit before referral

export interface PackDefinition {
  tier: PackTier;
  label: string;
  pricePaise: number;
  imageCount: number;
}

export const PACK_TIERS: Record<PackTier, PackDefinition> = {
  STARTER: { tier: "STARTER", label: "Starter Pack", pricePaise: 19_900, imageCount: 4 },
  STYLE: { tier: "STYLE", label: "Style Pack", pricePaise: 29_900, imageCount: 7 },
  COMPLETE: { tier: "COMPLETE", label: "Complete Pack", pricePaise: 39_900, imageCount: 10 },
  FULL_EXPLORE: { tier: "FULL_EXPLORE", label: "Full Explore", pricePaise: 99_900, imageCount: 15 },
};

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

/** P&L for a pack purchase (Starter / Style / Complete / Full Explore). */
export function calculatePackPnl(tier: PackTier): OrderPnl {
  const pack = PACK_TIERS[tier];
  return calculateOrderPnl(pack.pricePaise, pack.imageCount);
}

/** P&L for a My Assets add-on purchase (Background or Outfit), per photo. */
export function calculateAddonPnl(photoCount: number): OrderPnl {
  // One add-on "photo" = one generation, same ₹3.50 base cost as a pack image.
  return calculateOrderPnl(MY_ASSETS_ADDON_PRICE_PAISE * photoCount, photoCount);
}

/**
 * Referral payout, in paise, for a given order's profit-before-referral.
 * Callers MUST gate this on `isReferredFirstPurchase` — a referrer is paid
 * 10% only on a referred customer's very first purchase ever (any tier),
 * never on any purchase after that (confirmed explicitly by the user: buying
 * Starter Pack then later Full Explore pays referral only on the Starter
 * Pack purchase).
 */
export function calculateReferralPayoutPaise(profitBeforeReferralPaise: number, isReferredFirstPurchase: boolean): number {
  if (!isReferredFirstPurchase) return 0;
  return roundPaise(profitBeforeReferralPaise * REFERRAL_PAYOUT_RATE);
}

export interface FullOrderCalculation extends OrderPnl {
  isReferredFirstPurchase: boolean;
  referralPayoutPaise: number;
  netProfitPaise: number; // profit after referral payout is deducted
}

export function calculateFullOrder(
  pricePaise: number,
  imageCount: number,
  isReferredFirstPurchase: boolean
): FullOrderCalculation {
  const pnl = calculateOrderPnl(pricePaise, imageCount);
  const referralPayoutPaise = calculateReferralPayoutPaise(pnl.profitBeforeReferralPaise, isReferredFirstPurchase);
  return {
    ...pnl,
    isReferredFirstPurchase,
    referralPayoutPaise,
    netProfitPaise: pnl.profitBeforeReferralPaise - referralPayoutPaise,
  };
}

/** Convert paise to a ₹ display string, e.g. 14714 -> "147.14". */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

// ---------------------------------------------------------------------------
// TDS on referral payouts (Section 393, Income-tax Act 2025 — successor to
// the old Section 194H) — 2% TDS applies once a payee's referral payouts
// cross ₹20,000 in a financial year, and requires the payee's PAN on file.
// This is a compliance flag for the payout/settlement flow, not part of the
// per-order P&L above.
// ---------------------------------------------------------------------------
export const REFERRAL_TDS_RATE = 0.02;
export const REFERRAL_TDS_THRESHOLD_PAISE = 20_000_00; // ₹20,000/year per payee = 2,000,000 paise

export function calculateReferralTds(cumulativePayoutsThisYearPaise: number): { tdsApplies: boolean; tdsPaise: number } {
  const tdsApplies = cumulativePayoutsThisYearPaise > REFERRAL_TDS_THRESHOLD_PAISE;
  return {
    tdsApplies,
    tdsPaise: tdsApplies ? roundPaise(cumulativePayoutsThisYearPaise * REFERRAL_TDS_RATE) : 0,
  };
}

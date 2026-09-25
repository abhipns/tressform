// Tressform — in-memory fallback store, used ONLY when SUPABASE_MOCK_MODE is
// true (see lib/supabaseClient.ts). Lets the API routes demonstrate a full,
// stateful request flow (create order → webhook marks it paid → referral
// payout computed) in local dev / tests without a real Supabase project.
//
// This is intentionally process-memory only: it resets on every server
// restart and is NOT shared across serverless invocations in production —
// it exists purely so mock mode is genuinely exercisable end-to-end. Once a
// real Supabase project is connected (SUPABASE_MOCK_MODE becomes false), the
// API routes use getSupabaseAdmin() instead and this module is unused.

import type { AddonKind, PackTier } from "./pricing";

export interface MockOrder {
  id: string;
  userId: string;
  tier: PackTier | null;
  addonKind: AddonKind | null;
  addonPhotoCount: number;
  pricePaise: number;
  gstPaise: number;
  generationCostPaise: number;
  gatewayFeePaise: number;
  profitBeforeReferralPaise: number;
  isReferredFirstPurchase: boolean;
  referralPayoutPaise: number;
  status: "CREATED" | "PAID" | "FAILED" | "REFUNDED";
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface MockReferral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCodeUsed: string;
  firstPurchaseOrderId: string | null;
  payoutStatus: "PENDING" | "ELIGIBLE" | "PAID" | "INELIGIBLE";
  payoutPaise: number;
  createdAt: string;
}

export interface MockProfile {
  id: string;
  referralCode: string;
  referredBy: string | null;
  firstPurchaseOrderId: string | null;
  freePreviewsUsed: number;
  freePreviewsLimit: number;
}

// A module-level singleton keeps state across requests within one running
// server process (fine for local dev / a single test run).
const orders = new Map<string, MockOrder>();
const referrals = new Map<string, MockReferral>(); // keyed by referredId (one referral per customer)
const profiles = new Map<string, MockProfile>();

export const mockStore = {
  orders,
  referrals,
  profiles,

  getOrCreateProfile(userId: string): MockProfile {
    let profile = profiles.get(userId);
    if (!profile) {
      profile = {
        id: userId,
        referralCode: `mock_${userId.slice(0, 8)}`,
        referredBy: null,
        firstPurchaseOrderId: null,
        freePreviewsUsed: 0,
        freePreviewsLimit: 2, // lifetime cap of 2 free previews per account, see Part D
      };
      profiles.set(userId, profile);
    }
    return profile;
  },

  createOrder(order: MockOrder) {
    orders.set(order.id, order);
    return order;
  },

  getOrder(orderId: string) {
    return orders.get(orderId) ?? null;
  },

  findOrderByRazorpayOrderId(razorpayOrderId: string) {
    return [...orders.values()].find((o) => o.razorpayOrderId === razorpayOrderId) ?? null;
  },

  markOrderPaid(orderId: string, razorpayPaymentId: string) {
    const order = orders.get(orderId);
    if (!order) return null;
    order.status = "PAID";
    order.razorpayPaymentId = razorpayPaymentId;
    order.paidAt = new Date().toISOString();
    return order;
  },

  recordReferral(referral: MockReferral) {
    referrals.set(referral.referredId, referral);
    return referral;
  },

  getReferralForReferredUser(referredId: string) {
    return referrals.get(referredId) ?? null;
  },

  settleReferralPayout(referredId: string, orderId: string, payoutPaise: number) {
    const referral = referrals.get(referredId);
    if (!referral) return null;
    referral.firstPurchaseOrderId = orderId;
    referral.payoutStatus = payoutPaise > 0 ? "ELIGIBLE" : "INELIGIBLE";
    referral.payoutPaise = payoutPaise;
    return referral;
  },
};

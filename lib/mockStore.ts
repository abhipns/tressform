// Tressform — in-memory fallback store, used ONLY when SUPABASE_MOCK_MODE is
// true (see lib/supabaseClient.ts). Lets the API routes demonstrate a full,
// stateful request flow (create order → webhook marks it paid → referral
// credit computed) in local dev / tests without a real Supabase project.
//
// This is intentionally process-memory only: it resets on every server
// restart and is NOT shared across serverless invocations in production —
// it exists purely so mock mode is genuinely exercisable end-to-end. Once a
// real Supabase project is connected (SUPABASE_MOCK_MODE becomes false), the
// API routes use getSupabaseAdmin() instead and this module is unused.

import type { AddonKind, PackTier } from "./pricing";
import { financialYearStart } from "./pricing";

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
  // Flat, non-cash credit (see REFERRAL_CREDITS_BY_TIER_PAISE in
  // lib/pricing.ts) — 0 for add-on-only orders, even on a first purchase.
  referralCreditsPaise: number;
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
  payoutStatus: "PENDING" | "ELIGIBLE" | "PAID" | "INELIGIBLE"; // "PAID" here means "credited," not "cashed out"
  creditsPaise: number;
  createdAt: string;
}

export interface MockProfile {
  id: string;
  referralCode: string;
  referredBy: string | null;
  firstPurchaseOrderId: string | null;
  freePreviewsUsed: number;
  freePreviewsLimit: number;
  creditBalancePaise: number;
}

// carousel_sessions/carousel_photos mock, added per doc thread f3588221-19c8
// so the admin carousel-upload screen (app/admin/carousel) works end-to-end
// in mock mode too. Photos are kept as the data: URL the browser read them
// as — fine for previewing in a single dev session, lost on server restart,
// same caveat as everything else in this file.
export interface MockCarouselPhoto {
  id: string;
  src: string;
  tag: string;
  alt: string;
}

export interface MockCarouselSession {
  id: string;
  caption: string;
  photos: MockCarouselPhoto[];
  createdAt: string;
}

// photos/style_results mocks, added when app/api/analyze and app/api/generate
// were built (previously called by UploadFlow.tsx but didn't exist at all —
// the top-priority gap from the Master Section Plan doc's gap list). Mirrors
// db/schema.sql's photos/style_results tables closely enough that switching
// a route from mock mode to getSupabaseAdmin() later is a straight swap.
export interface MockPhoto {
  id: string;
  userId: string;
  storagePath: string; // the data: URL the browser already read the file as
  faceShape: string | null;
  faceShapeConfidence: number | null;
  rekognitionRaw: Record<string, unknown> | null;
  createdAt: string;
}

export interface MockStyleResult {
  id: string;
  userId: string;
  photoId: string;
  styleName: string;
  status: "SUCCEEDED" | "FAILED";
  resultImageUrl: string | null;
  provider: string;
  costPaise: number | null;
  createdAt: string;
}

// A module-level singleton keeps state across requests within one running
// server process (fine for local dev / a single test run).
const orders = new Map<string, MockOrder>();
const referrals = new Map<string, MockReferral>(); // keyed by referredId (one referral per customer)
const profiles = new Map<string, MockProfile>();
const carouselSessions = new Map<string, MockCarouselSession>();
const photos = new Map<string, MockPhoto>();
const styleResults = new Map<string, MockStyleResult>();

export const mockStore = {
  orders,
  referrals,
  profiles,
  carouselSessions,
  photos,
  styleResults,

  addPhoto(photo: MockPhoto) {
    photos.set(photo.id, photo);
    return photo;
  },

  getPhoto(id: string) {
    return photos.get(id) ?? null;
  },

  addStyleResult(result: MockStyleResult) {
    styleResults.set(result.id, result);
    return result;
  },

  listCarouselSessions(): MockCarouselSession[] {
    return [...carouselSessions.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  addCarouselSession(session: MockCarouselSession) {
    carouselSessions.set(session.id, session);
    return session;
  },

  deleteCarouselSession(id: string) {
    return carouselSessions.delete(id);
  },

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
        creditBalancePaise: 0,
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

  /**
   * Sum of credits this referrer has already earned in the Indian financial
   * year (1 Apr–31 Mar) containing `now` — the number to pass as
   * `cumulativeCreditsThisFYPaise` into calculateReferralCreditsPaiseWithCap
   * (lib/pricing.ts) before settling a new referral, so the ₹15,000/FY cap
   * (doc thread d7f981de) is enforced.
   */
  sumReferrerCreditsThisFY(referrerId: string, now: Date = new Date()): number {
    const fyStart = financialYearStart(now).getTime();
    return [...referrals.values()]
      .filter((r) => r.referrerId === referrerId && new Date(r.createdAt).getTime() >= fyStart)
      .reduce((sum, r) => sum + r.creditsPaise, 0);
  },

  /**
   * Credits the referrer's balance for a referred customer's qualifying
   * first purchase (tier packs only — see calculateReferralCreditsPaiseWithCap
   * in lib/pricing.ts, which is what callers should pass here as
   * `creditsPaise`, already capped; 0 when the first purchase was
   * add-on-only or the referrer already hit the FY cap).
   */
  settleReferralCredit(referredId: string, orderId: string, creditsPaise: number) {
    const referral = referrals.get(referredId);
    if (!referral) return null;
    referral.firstPurchaseOrderId = orderId;
    referral.payoutStatus = creditsPaise > 0 ? "ELIGIBLE" : "INELIGIBLE";
    referral.creditsPaise = creditsPaise;
    if (creditsPaise > 0) {
      const referrerProfile = mockStore.getOrCreateProfile(referral.referrerId);
      referrerProfile.creditBalancePaise += creditsPaise;
      referral.payoutStatus = "PAID"; // credited immediately — there's no separate cash-payout step for credits
    }
    return referral;
  },
};

// /api/payment/verify — second half of the checkout flow (see
// create-order/route.ts's header comment). Called by the client right after
// Razorpay's checkout widget reports success (or immediately, in mock mode,
// since there's no real widget to open without a real key). Verifies the
// payment signature server-side — never trust the client's word alone that
// a payment succeeded — then marks the order PAID and settles any referral
// credit.
//
// Referral settlement is deliberately best-effort: the doc's referral-code
// signup flow (turning "referred_by" on a profile into a `referrals` row)
// isn't wired up anywhere in this codebase yet, so if no referrals row
// exists for this user, credit settlement is skipped rather than invented.
// Once that flow exists, this route needs no changes — it already looks up
// the row and no-ops cleanly when it's missing.
//
// 14.10.2026: real payments are confirmed only by PayU (lib/payments.ts,
// via /api/payment/payu-return and /api/payment/payu-webhook); the old
// Razorpay integration file was removed. This route now serves the demo
// mode only (no database), where "Pay" completes at once.
//
// 09.10.2026 (real sign-in): in real mode the caller must be logged in and
// must own the order; an order that is already PAID is acknowledged without
// settling referral credit a second time; and — same rule as create-order —
// nothing is confirmed while Razorpay itself is still in mock mode.

import { NextRequest, NextResponse } from "next/server";
// 12.10.2026 (PayU): with a real database this route no longer confirms
// anything — real payments are confirmed only from PayU's own answer
// (lib/payments.ts, via payu-return / payu-webhook). It stays for the demo
// mode, where "Pay" completes instantly.
import { calculateReferralCreditsPaiseWithCap, type PackTier } from "@/lib/pricing";
import { mockStore } from "@/lib/mockStore";
import { recordPayuReturn } from "@/lib/checkoutEvents";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

interface VerifyBody {
  orderId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export async function POST(req: NextRequest) {
  let body: VerifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

  let callerId: string | null = null;
  if (!SUPABASE_MOCK_MODE) {
    return NextResponse.json({ error: "Payments are confirmed by PayU, not by this address." }, { status: 410 });
  }

  if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
    return NextResponse.json(
      { error: "orderId, razorpayOrderId, and razorpayPaymentId are required." },
      { status: 400 }
    );
  }


  if (SUPABASE_MOCK_MODE) {
    const order = mockStore.getOrder(orderId);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: "Order/payment mismatch." }, { status: 400 });
    }

    const wasPaid = order.status === "PAID";
    const paid = mockStore.markOrderPaid(orderId, razorpayPaymentId);
    if (!paid) return NextResponse.json({ error: "Failed to mark order paid." }, { status: 500 });

    // 14.10.2026: credit put toward the order leaves the balance on payment (lib/credit.ts).
    if (!wasPaid && (order.creditUsedPaise ?? 0) > 0) {
      const buyer = mockStore.getOrCreateProfile(order.userId);
      buyer.creditBalancePaise = Math.max(0, buyer.creditBalancePaise - (order.creditUsedPaise ?? 0));
    }

    // 27.10.2026: the demo's "payment" counts as a return from PayU for the checkout funnel.
    if (!wasPaid) await recordPayuReturn(order.id, true);

    // 26.10.2026: single pictures — the paid views, ready to be made.
    if (!wasPaid && order.orderKind === "PICTURES") mockStore.grantPictureViews(order.id);

    // Best-effort referral settlement — see file header for why this is a
    // no-op when there's no referrals row for this user yet.
    if (order.isReferredFirstPurchase && order.tier) {
      const profile = mockStore.getOrCreateProfile(order.userId);
      const referral = mockStore.getReferralForReferredUser(order.userId);
      if (referral && profile.referredBy) {
        const cumulative = mockStore.sumReferrerCreditsThisFY(profile.referredBy);
        const creditsPaise = calculateReferralCreditsPaiseWithCap(order.tier as PackTier, true, cumulative);
        order.referralCreditsPaise = creditsPaise;
        mockStore.settleReferralCredit(order.userId, order.id, creditsPaise);
      }
    }

    return NextResponse.json({ mockMode: true, success: true, orderId: paid.id, status: paid.status });
  }

  void callerId;
  void razorpaySignature;
  return NextResponse.json({ error: "Payments are confirmed by PayU, not by this address." }, { status: 410 });
}

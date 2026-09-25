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
// NOT covered by this route (left as-is, matching lib/integrations/
// razorpay.ts's own real-webhook TODO): a real Razorpay webhook endpoint as
// the authoritative payment-confirmation source. Client-side verification
// like this is fine for mock mode / getting the flow demoable end-to-end,
// but a production build should also add a webhook route
// (verifyWebhookSignature in lib/integrations/razorpay.ts is already there
// for it) so a payment can't be marked paid purely by a client call.

import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentSignature } from "@/lib/integrations/razorpay";
import { calculateReferralCreditsPaiseWithCap, type PackTier } from "@/lib/pricing";
import { mockStore } from "@/lib/mockStore";

const SUPABASE_MOCK_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
    return NextResponse.json(
      { error: "orderId, razorpayOrderId, and razorpayPaymentId are required." },
      { status: 400 }
    );
  }

  const signatureOk = verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature: razorpaySignature ?? "",
  });
  if (!signatureOk) {
    return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
  }

  if (SUPABASE_MOCK_MODE) {
    const order = mockStore.getOrder(orderId);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: "Order/payment mismatch." }, { status: 400 });
    }

    const paid = mockStore.markOrderPaid(orderId, razorpayPaymentId);
    if (!paid) return NextResponse.json({ error: "Failed to mark order paid." }, { status: 500 });

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

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const { data: order, error: fetchError } = await admin.from("orders").select("*").eq("id", orderId).single();
  if (fetchError || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.razorpay_order_id !== razorpayOrderId) {
    return NextResponse.json({ error: "Order/payment mismatch." }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({
      status: "PAID",
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  if (order.is_referred_first_purchase && order.tier) {
    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", order.user_id)
      .maybeSingle();

    if (referral?.referrer_id) {
      const fyStart = new Date();
      fyStart.setUTCMonth(fyStart.getUTCMonth() >= 3 ? 3 : -9, 1);
      fyStart.setUTCHours(0, 0, 0, 0);

      const { data: priorCredits } = await admin
        .from("referrals")
        .select("credits_paise")
        .eq("referrer_id", referral.referrer_id)
        .gte("created_at", fyStart.toISOString());

      const cumulative = (priorCredits ?? []).reduce((sum, r) => sum + (r.credits_paise ?? 0), 0);
      const creditsPaise = calculateReferralCreditsPaiseWithCap(order.tier as PackTier, true, cumulative);

      await admin
        .from("referrals")
        .update({
          first_purchase_order_id: orderId,
          first_purchase_qualified: true,
          credits_paise: creditsPaise,
          payout_status: creditsPaise > 0 ? "PAID" : "INELIGIBLE",
          paid_at: creditsPaise > 0 ? new Date().toISOString() : null,
        })
        .eq("id", referral.id);

      if (creditsPaise > 0) {
        await admin.rpc("increment_credit_balance", { profile_id: referral.referrer_id, amount_paise: creditsPaise }).then(
          () => {},
          () => {} // rpc may not exist yet — best-effort, same spirit as the mock-mode branch
        );
      }
      await admin.from("orders").update({ referral_credits_paise: creditsPaise }).eq("id", orderId);
    }
  }

  return NextResponse.json({ mockMode: false, success: true, orderId, status: "PAID" });
}

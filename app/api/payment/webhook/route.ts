// POST /api/payment/webhook
// Razorpay webhook receiver. On `payment.captured`, marks the matching order
// PAID and — if it was a referred customer's first purchase — settles the
// referral payout that was pre-computed at order-creation time.
//
// IMPORTANT: verifies the X-Razorpay-Signature header against the raw body
// before trusting anything in the payload (real mode only — mock mode always
// verifies true, see lib/integrations/razorpay.ts).

import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/integrations/razorpay";
import { getSupabaseAdmin, SUPABASE_MOCK_MODE } from "@/lib/supabaseClient";
import { mockStore } from "@/lib/mockStore";

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        status: string;
      };
    };
  };
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (event.event !== "payment.captured") {
    // Acknowledge other events (order.paid, payment.failed, etc.) without action.
    return NextResponse.json({ received: true, ignored: event.event });
  }

  const razorpayOrderId = event.payload.payment.entity.order_id;
  const razorpayPaymentId = event.payload.payment.entity.id;

  if (SUPABASE_MOCK_MODE) {
    const order = mockStore.findOrderByRazorpayOrderId(razorpayOrderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found for this webhook." }, { status: 404 });
    }
    mockStore.markOrderPaid(order.id, razorpayPaymentId);

    const profile = mockStore.getOrCreateProfile(order.userId);
    if (!profile.firstPurchaseOrderId) profile.firstPurchaseOrderId = order.id;

    if (order.isReferredFirstPurchase && order.referralPayoutPaise > 0) {
      mockStore.settleReferralPayout(order.userId, order.id, order.referralPayoutPaise);
    }

    return NextResponse.json({ received: true, orderId: order.id, status: "PAID", mock: true });
  }

  const admin = getSupabaseAdmin();
  const { data: order, error: findError } = await admin
    .from("orders")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .single();

  if (findError || !order) {
    return NextResponse.json({ error: "Order not found for this webhook." }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "PAID", razorpay_payment_id: razorpayPaymentId, paid_at: new Date().toISOString() })
    .eq("id", order.id);

  if (updateError) {
    return NextResponse.json({ error: `Failed to mark order PAID: ${updateError.message}` }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("first_purchase_order_id")
    .eq("id", order.user_id)
    .single();

  if (profile && !profile.first_purchase_order_id) {
    await admin.from("profiles").update({ first_purchase_order_id: order.id }).eq("id", order.user_id);
  }

  if (order.is_referred_first_purchase && order.referral_payout_paise > 0) {
    await admin
      .from("referrals")
      .update({
        first_purchase_order_id: order.id,
        payout_status: "ELIGIBLE",
        payout_paise: order.referral_payout_paise,
      })
      .eq("referred_id", order.user_id);
  }

  return NextResponse.json({ received: true, orderId: order.id, status: "PAID", mock: false });
}

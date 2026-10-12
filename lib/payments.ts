// Tressform — confirming a PayU payment against a real database.
//
// 12.10.2026. One function, used by the three places that may learn about
// a payment: PayU's browser return (/api/payment/payu-return), PayU's
// server call (/api/payment/payu-webhook) and the "Payment confirmed" page
// (/api/payment/order/[orderId], for an order still CREATED). Whichever
// runs first marks the order PAID; the others find it already PAID.
//
// The order is marked PAID only when PayU itself, asked server to server,
// says the transaction succeeded for exactly the order's price. Nothing
// posted by a browser is trusted.
//
// Orders keep PayU's transaction id in the column still named
// razorpay_order_id and PayU's payment id (mihpayid) in razorpay_payment_id —
// the names are left over from the Razorpay code; renaming them would need a
// database change for no gain.
//
// Server-only.

import { verifyPayment } from "@/lib/integrations/payu";
import { calculateReferralCreditsPaiseWithCap, type PackTier } from "@/lib/pricing";

export type ConfirmResult =
  | { found: false }
  | { found: true; orderId: string; tier: string | null; status: "PAID" | "FAILED" | "PENDING" };

/** Look up the order for a PayU txnid and settle it from PayU's own answer. */
export async function confirmPayuTxn(txnid: string): Promise<ConfirmResult> {
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const { data: order } = await admin.from("orders").select("*").eq("razorpay_order_id", txnid).maybeSingle();
  if (!order) return { found: false };
  if (order.status === "PAID") return { found: true, orderId: order.id, tier: order.tier, status: "PAID" };
  if (order.status === "REFUNDED") return { found: true, orderId: order.id, tier: order.tier, status: "FAILED" };

  const v = await verifyPayment(txnid);

  if (v.status === "success") {
    if (v.amountPaise !== order.price_paise || (v.orderId && v.orderId !== order.id)) {
      console.error(`[Tressform] PayU ${txnid}: paid ${v.amountPaise} paise for order ${order.id} priced ${order.price_paise} — not marked paid.`);
      return { found: true, orderId: order.id, tier: order.tier, status: "PENDING" };
    }
    // Conditional update: only one caller can move the order to PAID, so
    // referral credit is settled exactly once.
    const { data: updated } = await admin
      .from("orders")
      .update({ status: "PAID", razorpay_payment_id: v.paymentId, paid_at: new Date().toISOString() })
      .eq("id", order.id)
      .in("status", ["CREATED", "FAILED"])
      .select("id");
    if (updated && updated.length > 0) await settleReferral(admin, order);
    return { found: true, orderId: order.id, tier: order.tier, status: "PAID" };
  }

  if (v.status === "failure" || v.status === "failed" || v.status === "usercancelled") {
    await admin.from("orders").update({ status: "FAILED" }).eq("id", order.id).eq("status", "CREATED");
    return { found: true, orderId: order.id, tier: order.tier, status: "FAILED" };
  }

  // "pending", "in progress", "not found" (customer hasn't finished): leave it.
  return { found: true, orderId: order.id, tier: order.tier, status: "PENDING" };
}

// Referral credit on a referred customer's first purchase. Best-effort and
// a no-op while no referrals row exists (the referral sign-up flow isn't
// built yet). Moved here unchanged from the old /api/payment/verify route.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function settleReferral(admin: any, order: { id: string; user_id: string; tier: string | null; is_referred_first_purchase: boolean }) {
  if (!order.is_referred_first_purchase || !order.tier) return;
  try {
    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_id")
      .eq("referred_id", order.user_id)
      .maybeSingle();
    if (!referral?.referrer_id) return;

    const fyStart = new Date();
    fyStart.setUTCMonth(fyStart.getUTCMonth() >= 3 ? 3 : -9, 1);
    fyStart.setUTCHours(0, 0, 0, 0);
    const { data: priorCredits } = await admin
      .from("referrals")
      .select("credits_paise")
      .eq("referrer_id", referral.referrer_id)
      .gte("created_at", fyStart.toISOString());
    const cumulative = ((priorCredits ?? []) as { credits_paise: number | null }[]).reduce((s, r) => s + (r.credits_paise ?? 0), 0);
    const creditsPaise = calculateReferralCreditsPaiseWithCap(order.tier as PackTier, true, cumulative);

    await admin
      .from("referrals")
      .update({
        first_purchase_order_id: order.id,
        first_purchase_qualified: true,
        credits_paise: creditsPaise,
        payout_status: creditsPaise > 0 ? "PAID" : "INELIGIBLE",
        paid_at: creditsPaise > 0 ? new Date().toISOString() : null,
      })
      .eq("id", referral.id);
    if (creditsPaise > 0) {
      await admin.rpc("increment_credit_balance", { profile_id: referral.referrer_id, amount_paise: creditsPaise }).then(
        () => {},
        () => {}
      );
    }
    await admin.from("orders").update({ referral_credits_paise: creditsPaise }).eq("id", order.id);
  } catch (err) {
    console.error("[Tressform] referral settlement failed (payment itself is confirmed):", err);
  }
}

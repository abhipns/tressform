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
import { financialYearStart } from "@/lib/referral";
import { grantPictureViews } from "@/lib/pictures";

export type ConfirmResult =
  | { found: false }
  | { found: true; orderId: string; tier: string | null; status: "PAID" | "FAILED" | "PENDING" };

/** Look up the order for a PayU txnid and settle it from PayU's own answer. */
export async function confirmPayuTxn(txnid: string, via: "return" | "webhook" | "check" | "page" = "page"): Promise<ConfirmResult> {
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const { data: order } = await admin.from("orders").select("*").eq("razorpay_order_id", txnid).maybeSingle();
  if (!order) return { found: false };
  if (order.status === "PAID") return { found: true, orderId: order.id, tier: order.tier, status: "PAID" };
  if (order.status === "REFUNDED") return { found: true, orderId: order.id, tier: order.tier, status: "FAILED" };

  let v: Awaited<ReturnType<typeof verifyPayment>>;
  try {
    v = await verifyPayment(txnid);
  } catch (err) {
    await note(admin, via, txnid, { error: (err as Error)?.message ?? String(err) });
    throw err;
  }
  // 21.10.2026: on 19.10.2026 two paid QR-code payments weren't marked paid
  // for a day, and no record said why. Now, whenever PayU's own answer is
  // anything but "success" when the customer comes back from PayU, or PayU
  // calls the webhook, or the daily check asks, it is written down.
  if (v.status !== "success" && via !== "page") await note(admin, via, txnid, { status: v.status, detail: v.detail ?? null, amountPaise: v.amountPaise });

  if (v.status === "success") {
    if (v.amountPaise !== order.price_paise || (v.orderId && v.orderId !== order.id)) {
      console.error(`[Tressform] PayU ${txnid}: paid ${v.amountPaise} paise for order ${order.id} priced ${order.price_paise} — not marked paid.`);
      await note(admin, via, txnid, { problem: "amount or order mismatch", paid: v.amountPaise, price: order.price_paise, udf1: v.orderId, order: order.id });
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
    if (updated && updated.length > 0) {
      await spendOrderCredit(admin, order);
      await settleReferral(admin, order);
      // 26.10.2026: single pictures — the paid views, ready to be made (lib/pictures.ts).
      if (order.order_kind === "PICTURES") await grantPictureViews(admin, order.id);
    }
    return { found: true, orderId: order.id, tier: order.tier, status: "PAID" };
  }

  if (v.status === "failure" || v.status === "failed" || v.status === "usercancelled") {
    await admin.from("orders").update({ status: "FAILED" }).eq("id", order.id).eq("status", "CREATED");
    return { found: true, orderId: order.id, tier: order.tier, status: "FAILED" };
  }

  // "pending", "in progress", "not found" (customer hasn't finished): leave it.
  return { found: true, orderId: order.id, tier: order.tier, status: "PENDING" };
}

// 14.10.2026: credit the customer put toward this order (lib/credit.ts) leaves
// their balance now that PayU has confirmed the payment — never earlier, so a
// cancelled payment costs nothing. spend_credit refuses rather than going
// below zero; that can only happen if the same credit was spent on another
// order in the meantime, and the customer has still paid the reduced price,
// so the order stands and the mismatch is logged for the owner to look at.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function spendOrderCredit(admin: any, order: { id: string; user_id: string; credit_used_paise?: number | null }) {
  const amount = order.credit_used_paise ?? 0;
  if (amount <= 0) return;
  try {
    const { data: took, error } = await admin.rpc("spend_credit", { p_user: order.user_id, p_amount: amount });
    if (error || took !== true) {
      console.error(
        `[Tressform] order ${order.id}: could not take ${amount} paise of credit from ${order.user_id} (balance too low or error).`,
        error ?? ""
      );
    }
  } catch (err) {
    console.error(`[Tressform] order ${order.id}: taking credit failed.`, err);
  }
}

// Referral credit on a referred customer's first purchase. Best-effort: a
// no-op when the customer wasn't referred. The referrals row it looks for is
// made by /api/referral/claim (14.10.2026; see lib/referral.ts).
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

    // 14.10.2026: the ₹15,000 yearly cap counts credit by when it was EARNED
    // (paid_at), in India's financial year — not by when the friend signed
    // up, which put a March sign-up / April purchase in the wrong year.
    const { data: priorCredits } = await admin
      .from("referrals")
      .select("credits_paise")
      .eq("referrer_id", referral.referrer_id)
      .gte("paid_at", financialYearStart().toISOString());
    const cumulative = ((priorCredits ?? []) as { credits_paise: number | null }[]).reduce((s, r) => s + (r.credits_paise ?? 0), 0);
    const creditsPaise = calculateReferralCreditsPaiseWithCap(order.tier as PackTier, true, cumulative);

    // 20.10.2026: only the FIRST paid order settles the referral. Two orders
    // made before either was paid are both flagged "first purchase" (a
    // customer paid twice by QR code), so the update only goes through while
    // no order has claimed the referral yet; the second finds it taken and
    // pays the referrer nothing more.
    const { data: claimed } = await admin
      .from("referrals")
      .update({
        first_purchase_order_id: order.id,
        first_purchase_qualified: true,
        credits_paise: creditsPaise,
        payout_status: creditsPaise > 0 ? "PAID" : "INELIGIBLE",
        paid_at: creditsPaise > 0 ? new Date().toISOString() : null,
      })
      .eq("id", referral.id)
      .is("first_purchase_order_id", null)
      .select("id");
    if (!claimed || claimed.length === 0) return;
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

/** A line in job_runs ("payu_check") about a payment PayU didn't confirm. Best-effort. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function note(admin: any, via: string, txnid: string, what: Record<string, unknown>) {
  try {
    await admin.from("job_runs").insert({ job: "payu_check", summary: { txnid, via, ...what } });
  } catch {
    /* never in the way of a payment */
  }
}

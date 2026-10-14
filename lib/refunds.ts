// Tressform — "Mark as refunded" (14.10.2026, owner's request).
//
// Refunds are made by the owner in the PayU dashboard; PayU doesn't tell the
// site. On /admin/orders the owner then marks the order as refunded, and
// this puts everything else right in one go:
//   1. the order becomes REFUNDED (only from PAID, so it can't happen twice).
//      That alone takes its unused looks away (only PAID orders give looks,
//      lib/allowance.ts), stops new side views being made from it
//      (/api/generate/views), and takes it out of the dashboard's sales and
//      "AI cost still to come";
//   2. the Tressform credit the customer put toward it goes back to them;
//   3. if it was a referred customer's first purchase, the credit their
//      referrer earned from it is taken back — as much of it as is still in
//      the referrer's balance (they may have spent some; the shortfall is
//      reported, not chased).
// The money itself is refunded in PayU by the owner, before or after.
//
// Server-only.

/** How much of a referrer's earned credit can be taken back, given what is left in their balance. */
export function takeBack(earnedPaise: number, balancePaise: number): { takenPaise: number; shortPaise: number } {
  const earned = Math.max(0, Math.floor(earnedPaise));
  const taken = Math.min(earned, Math.max(0, Math.floor(balancePaise)));
  return { takenPaise: taken, shortPaise: earned - taken };
}

export type RefundResult =
  | { ok: true; creditReturnedPaise: number; referralTakenBackPaise: number; referralShortPaise: number }
  | { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function refundOrder(admin: any, orderId: string): Promise<RefundResult> {
  // 1. PAID → REFUNDED, once.
  const { data: rows, error } = await admin
    .from("orders")
    .update({ status: "REFUNDED" })
    .eq("id", orderId)
    .eq("status", "PAID")
    .select("id, user_id, credit_used_paise, referral_credits_paise");
  if (error) return { ok: false, error: "Couldn't update the order. Please try again." };
  const order = rows?.[0] as
    | { id: string; user_id: string; credit_used_paise: number | null; referral_credits_paise: number | null }
    | undefined;
  if (!order) {
    const { data: now } = await admin.from("orders").select("status").eq("id", orderId).maybeSingle();
    if (!now) return { ok: false, error: "That order doesn't exist." };
    return { ok: false, error: now.status === "REFUNDED" ? "This order is already marked as refunded." : "Only a paid order can be refunded." };
  }

  // 2. The customer's credit back.
  const credit = Math.max(0, order.credit_used_paise ?? 0);
  if (credit > 0) {
    const { error: creditError } = await admin.rpc("increment_credit_balance", { profile_id: order.user_id, amount_paise: credit });
    if (creditError) console.error(`[Tressform] refund ${order.id}: credit not returned.`, creditError);
  }

  // 3. The referrer's credit from this purchase, taken back.
  let taken = 0;
  let short = 0;
  const earned = Math.max(0, order.referral_credits_paise ?? 0);
  if (earned > 0) {
    const { data: referral } = await admin
      .from("referrals")
      .select("id, referrer_id")
      .eq("first_purchase_order_id", order.id)
      .maybeSingle();
    if (referral?.referrer_id) {
      const { data: referrer } = await admin.from("profiles").select("credit_balance_paise").eq("id", referral.referrer_id).maybeSingle();
      const split = takeBack(earned, referrer?.credit_balance_paise ?? 0);
      if (split.takenPaise > 0) {
        const { data: ok } = await admin.rpc("spend_credit", { p_user: referral.referrer_id, p_amount: split.takenPaise });
        taken = ok === true ? split.takenPaise : 0;
      }
      short = earned - taken;
      await admin
        .from("referrals")
        .update({ credits_paise: 0, payout_status: "INELIGIBLE", first_purchase_qualified: false })
        .eq("id", referral.id);
    }
    await admin.from("orders").update({ referral_credits_paise: 0 }).eq("id", order.id);
  }

  return { ok: true, creditReturnedPaise: credit, referralTakenBackPaise: taken, referralShortPaise: short };
}

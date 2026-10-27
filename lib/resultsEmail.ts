// Tressform — "your looks are saved" email after paying without an account
// (27.10.2026, owner's request). See lib/checkoutSteps.ts for the new
// checkout and lib/resultsLink.ts for the private link.
//
// Sent once per order (orders.results_email_sent_at), when the payment is
// confirmed (lib/payments.ts), only if the customer typed an email at
// checkout. The best link signs them into their own account on any phone:
// the email is added to their (anonymous) account, confirmed, and a one-time
// sign-in link is made that opens their results. If the email already
// belongs to another account, the email has the private view-only link
// instead. Best-effort: a payment never fails over this email.
//
// Server-only.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCustomerEmail } from "./ownerAlerts";
import { resultsLink } from "./resultsLink";

export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tressform.co.in").replace(/\/+$/, "");

type Order = { id: string; user_id: string; contact_email?: string | null };

/** The text of the email. */
export function resultsEmailText(link: string, signsIn: boolean): string {
  return [
    "Thank you for your Tressform order.",
    "",
    signsIn
      ? "Your looks are saved to your account. Open this link to see them on any phone (it signs you in):"
      : "Your looks are saved. Open this private link to see and download them on any phone:",
    link,
    "",
    "Keep this email: the link is only for you.",
    "Questions? Just reply, or write to support@tressform.co.in.",
    "",
    "— Tressform",
  ].join("\n");
}

async function signInLink(admin: SupabaseClient, order: Order, email: string): Promise<string | null> {
  try {
    const { data: got } = await admin.auth.admin.getUserById(order.user_id);
    const user = got?.user;
    if (!user) return null;
    if (!user.email) {
      // Their account has no email yet (they paid without making one): add this one.
      const { error } = await admin.auth.admin.updateUserById(order.user_id, { email, email_confirm: true });
      if (error) return null; // e.g. the email belongs to another account
    } else if (user.email.toLowerCase() !== email) {
      return null;
    }
    const next = encodeURIComponent(`/results/${order.id}`);
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${SITE_ORIGIN}/auth/callback?next=${next}` },
    });
    if (error) return null;
    return data?.properties?.action_link ?? null;
  } catch (err) {
    console.error(`[Tressform] order ${order.id}: sign-in link not made.`, (err as Error)?.message ?? err);
    return null;
  }
}

export async function sendResultsEmail(admin: SupabaseClient, order: Order): Promise<void> {
  const email = order.contact_email?.trim().toLowerCase();
  if (!email) return;
  try {
    // Once per order, even if the payment is confirmed from two places at once.
    const { data: claimed } = await admin
      .from("orders")
      .update({ results_email_sent_at: new Date().toISOString() })
      .eq("id", order.id)
      .is("results_email_sent_at", null)
      .select("id");
    if (!claimed || claimed.length === 0) return;
    const signIn = await signInLink(admin, order, email);
    const link = signIn ?? resultsLink(SITE_ORIGIN, order.id);
    const sent = await sendCustomerEmail(email, "Your Tressform looks", resultsEmailText(link, Boolean(signIn)));
    if (sent !== "sent") console.error(`[Tressform] order ${order.id}: results email ${sent}.`);
  } catch (err) {
    console.error(`[Tressform] order ${order.id}: results email not sent.`, (err as Error)?.message ?? err);
  }
}

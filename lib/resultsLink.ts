// Tressform — the private link to a customer's results (27.10.2026).
//
// A customer who pays without an account (lib/checkoutSteps.ts) and gives an
// email gets one email after paying, so they can't lose what they paid for.
// Best case the email signs them straight into their own account (their
// email is added to it at that moment). When that isn't possible — the
// email already belongs to another Tressform account — the email carries
// this link instead: /results/<order>?k=<key>. The key is made from the
// order id with a server-only secret, so it can't be guessed, and it only
// opens that one order's results, to view and download.
//
// Server-only.

import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return process.env.RESULTS_LINK_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "tressform-demo-only";
}

export function resultsKey(orderId: string, key = secret()): string {
  return createHmac("sha256", key).update(`results:${orderId}`).digest("hex").slice(0, 40);
}

export function resultsKeyOk(orderId: string, given: unknown, key = secret()): boolean {
  if (typeof given !== "string" || !/^[0-9a-f]{40}$/.test(given)) return false;
  const want = Buffer.from(resultsKey(orderId, key));
  const got = Buffer.from(given);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function resultsLink(origin: string, orderId: string): string {
  return `${origin.replace(/\/+$/, "")}/results/${orderId}?k=${resultsKey(orderId)}`;
}

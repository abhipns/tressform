// Tressform — the checkout without an account wall (27.10.2026, owner's request).
//
// 23–27 Oct 2026: 600 ad visitors, 139 selfies, 20 reached /checkout, 4 made
// an account and 0 pressed Pay. The "create your account first" box was
// where they left. Now a visitor on the anonymous account (lib/authClient.ts
// ensureSession) pays with only their mobile number (PayU needs it) and, if
// they like, an email. The order stays on that same anonymous account, so
// the photo, hairstyle list and paid pictures stay with them; after paying,
// the results page offers "Save your looks to your account".
//
// The checkout steps each visitor reaches are recorded (checkout_events),
// so the owner's dashboard shows exactly where people stop:
//   opened          /checkout opened
//   phone           a valid mobile number typed in
//   pay             Pay pressed and the order made (recorded by the server)
//   return_success  back from PayU, paid
//   return_fail     back from PayU, not paid (failed or cancelled)
// Only the anonymous visitor id is kept (the same one the visit counter
// uses), never the phone number or email.
//
// Pure functions only, so they can be tested.

export const CHECKOUT_STEPS = ["opened", "phone", "pay", "return_success", "return_fail"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

/** The steps the browser may report; "pay" and the PayU returns are recorded by the server only. */
export const BROWSER_STEPS: CheckoutStep[] = ["opened", "phone"];

export const STEP_LABEL: Record<CheckoutStep, string> = {
  opened: "Opened checkout",
  phone: "Entered mobile number",
  pay: "Pressed Pay",
  return_success: "Paid (back from PayU)",
  return_fail: "Payment failed or cancelled",
};

export const VISITOR_ID = /^[A-Za-z0-9-]{8,64}$/;

/** A tidy email address, or null. */
export function cleanEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 200) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

/**
 * The email PayU is given: the account's own email, else the one typed at
 * checkout, else Tressform's support address (PayU needs one; its receipt
 * then goes to support instead of the customer).
 */
export function payerEmail(accountEmail: string | null | undefined, typed: unknown, fallback: string): string {
  return cleanEmail(accountEmail) ?? cleanEmail(typed) ?? fallback;
}

/** The checkout funnel: how many different visitors reached each step. */
export function checkoutFunnel(events: { visitor: string | null; step: string }[]): { step: CheckoutStep; label: string; visitors: number }[] {
  const seen = new Map<CheckoutStep, Set<string>>(CHECKOUT_STEPS.map((s) => [s, new Set<string>()]));
  for (const e of events) {
    if (!e.visitor || !(CHECKOUT_STEPS as readonly string[]).includes(e.step)) continue;
    seen.get(e.step as CheckoutStep)!.add(e.visitor);
  }
  return CHECKOUT_STEPS.map((step) => ({ step, label: STEP_LABEL[step], visitors: seen.get(step)!.size }));
}

/**
 * Where the browser goes after PayU. Paid or still waiting: the results
 * page. Failed: back to the same pack's checkout; a single-picture order
 * (no pack) goes to its results page, which shows "Try again" for the same
 * pictures (before 27.10.2026 it went to a checkout with no pack named).
 */
export function afterPayuPath(r: { orderId: string; tier: string | null; status: "PAID" | "FAILED" | "PENDING" }): string {
  if (r.status === "FAILED" && r.tier) return `/checkout?tier=${r.tier}&payment=failed`;
  return `/results/${r.orderId}`;
}

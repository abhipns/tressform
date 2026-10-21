// Tressform — PayU (India) payment gateway. Replaces the Razorpay code, which
// never went live.
//
// 12.10.2026. How a payment works ("PayU Hosted Checkout"):
//
//   1. /api/payment/create-order prices the pack on the server, saves a
//      CREATED order, and returns the fields of a form plus PayU's address.
//   2. The checkout page submits that form, so the customer's browser goes
//      to PayU's own payment page (card / UPI / net banking happen there;
//      Tressform never sees them).
//   3. PayU sends the browser back to /api/payment/payu-return (success or
//      failure). PayU also calls /api/payment/payu-webhook from its servers,
//      which matters when the customer closes the tab before coming back.
//   4. In both places Tressform does NOT trust what was posted to it. It
//      asks PayU directly ("verify_payment") whether that transaction was
//      paid and for how much, and only then marks the order PAID
//      (lib/payments.ts, which is safe to run twice).
//
// Settings (Vercel → Settings → Environment Variables):
//   PAYU_KEY    the merchant key from the PayU dashboard
//   PAYU_SALT   the salt (keep secret; never sent to the browser)
//   PAYU_MODE   "live" for real money; anything else (or unset) = PayU's
//               test environment, where only test cards / test UPI work.
// The key and salt for test mode and live mode are different — change all
// three together.
//
// MOCK MODE: with no key/salt, PAYU_MOCK_MODE is true. The demo (no
// database) then completes payments instantly through /api/payment/verify;
// with a real database connected, create-order refuses to take payments.

import crypto from "crypto";

const PAYU_KEY = process.env.PAYU_KEY?.trim();
const PAYU_SALT = process.env.PAYU_SALT?.trim();

export const PAYU_MOCK_MODE = !PAYU_KEY || !PAYU_SALT;
export const PAYU_LIVE = process.env.PAYU_MODE?.trim().toLowerCase() === "live";

/** Where the browser posts the payment form. */
export const PAYU_PAYMENT_URL = PAYU_LIVE ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment";

/** PayU's server-to-server API (used here for verify_payment). */
const PAYU_API_URL = PAYU_LIVE
  ? "https://info.payu.in/merchant/postservice.php?form=2"
  : "https://test.payu.in/merchant/postservice.php?form=2";

const sha512 = (s: string) => crypto.createHash("sha512").update(s, "utf8").digest("hex");

/** PayU wants rupees with two decimals: 19900 paise → "199.00". */
export function paiseToPayuAmount(paise: number): string {
  return (paise / 100).toFixed(2);
}

/**
 * A transaction id for PayU. PayU limits txnid to 25 characters, so the
 * order's UUID (36) can't be used; the UUID travels in udf1 instead.
 */
export function newTxnId(): string {
  return `TF${Date.now().toString(36)}${crypto.randomBytes(5).toString("hex")}`.toUpperCase();
}

export interface PaymentFormInput {
  txnid: string;
  amountPaise: number;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  /** Our order id (UUID), returned to us by PayU. */
  orderId: string;
  surl: string;
  furl: string;
}

/** Only letters and spaces, as PayU's form expects for names. */
export function cleanFirstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  const cleaned = first.replace(/[^A-Za-z]/g, "").slice(0, 30);
  return cleaned || "Customer";
}

/** The request hash: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT). */
export function requestHash(f: { txnid: string; amount: string; productinfo: string; firstname: string; email: string; udf1: string }): string {
  if (PAYU_MOCK_MODE) throw new Error("PayU is not configured.");
  return sha512(
    // udf2–udf5 empty, then the five reserved empty fields, then the salt.
    [PAYU_KEY, f.txnid, f.amount, f.productinfo, f.firstname, f.email, f.udf1, "", "", "", "", "", "", "", "", "", PAYU_SALT].join("|")
  );
}

/** The fields of the form the browser posts to PAYU_PAYMENT_URL. */
export function buildPaymentForm(input: PaymentFormInput): { action: string; fields: Record<string, string> } {
  if (PAYU_MOCK_MODE) throw new Error("PayU is not configured.");
  const amount = paiseToPayuAmount(input.amountPaise);
  const fields: Record<string, string> = {
    key: PAYU_KEY!,
    txnid: input.txnid,
    amount,
    productinfo: input.productinfo,
    firstname: input.firstname,
    email: input.email,
    phone: input.phone,
    udf1: input.orderId,
    surl: input.surl,
    furl: input.furl,
  };
  fields.hash = requestHash({ txnid: input.txnid, amount, productinfo: input.productinfo, firstname: input.firstname, email: input.email, udf1: input.orderId });
  return { action: PAYU_PAYMENT_URL, fields };
}

/**
 * Check the hash on what PayU posts back:
 * sha512([additional_charges|]SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key).
 * Only a first filter — the order is marked paid only after verifyPayment().
 */
export function responseHashOk(p: Record<string, string | undefined>): boolean {
  if (PAYU_MOCK_MODE || !p.hash) return false;
  const parts = [
    PAYU_SALT,
    p.status ?? "",
    "", "", "", "", "",
    p.udf5 ?? "", p.udf4 ?? "", p.udf3 ?? "", p.udf2 ?? "", p.udf1 ?? "",
    p.email ?? "", p.firstname ?? "", p.productinfo ?? "", p.amount ?? "", p.txnid ?? "", PAYU_KEY,
  ];
  if (p.additionalCharges) parts.unshift(p.additionalCharges);
  const expected = sha512(parts.join("|"));
  const a = Buffer.from(expected);
  const b = Buffer.from(p.hash.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface VerifiedPayment {
  /** PayU's word for the transaction: "success", "failure", "pending", "not found", … */
  status: string;
  /** Amount PayU says was paid, in paise (0 when unknown). */
  amountPaise: number;
  /** PayU's own payment id (mihpayid). */
  paymentId: string | null;
  /** Our order id, as sent in udf1. */
  orderId: string | null;
  /** 21.10.2026: PayU's finer status and message, kept for checking a payment that wasn't confirmed. */
  detail?: string;
}

/** Ask PayU, server to server, what happened to a transaction. */
export async function verifyPayment(txnid: string): Promise<VerifiedPayment> {
  if (PAYU_MOCK_MODE) throw new Error("PayU is not configured.");
  const command = "verify_payment";
  const body = new URLSearchParams({
    key: PAYU_KEY!,
    command,
    var1: txnid,
    hash: sha512([PAYU_KEY, command, txnid, PAYU_SALT].join("|")),
  });
  const res = await fetch(PAYU_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  let data: { status?: number; transaction_details?: Record<string, Record<string, string>> };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`PayU verify_payment did not return JSON (HTTP ${res.status}).`);
  }
  const t = data.transaction_details?.[txnid];
  if (!t) return { status: "not found", amountPaise: 0, paymentId: null, orderId: null, detail: `HTTP ${res.status}, api status ${data.status ?? "?"}` };
  const amount = Number(t.amt ?? t.transaction_amount ?? t.amount ?? "0");
  return {
    status: String(t.status ?? "").toLowerCase(),
    amountPaise: Number.isFinite(amount) ? Math.round(amount * 100) : 0,
    paymentId: t.mihpayid ? String(t.mihpayid) : null,
    orderId: t.udf1 ? String(t.udf1) : null,
    ...(t.unmappedstatus || t.field9 || t.error_Message ? { detail: [t.unmappedstatus, t.field9, t.error_Message].filter(Boolean).join(" · ").slice(0, 300) } : {}),
  };
}

/** Read a PayU post (form-encoded, or JSON for some webhook setups) into a flat object. */
export async function readPayuPost(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") || "";
  const raw = await req.text();
  if (type.includes("application/json")) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v == null ? "" : String(v)]));
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

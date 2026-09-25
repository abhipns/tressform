// Tressform — Razorpay integration (checkout for pack purchases + add-ons).
//
// MOCK MODE: when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are absent,
// createOrder() returns a fake order id and verifyPaymentSignature() /
// verifyWebhookSignature() both return true, so the checkout flow can be
// built and exercised end-to-end without a real Razorpay account.

import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export const RAZORPAY_MOCK_MODE = !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET;

export interface CreateOrderParams {
  amountPaise: number;
  receipt: string; // our internal order id
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: "INR";
  receipt: string;
  status: string;
  mock: boolean;
}

export async function createOrder(params: CreateOrderParams): Promise<RazorpayOrder> {
  if (RAZORPAY_MOCK_MODE) {
    return {
      id: `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      status: "created",
      mock: true,
    };
  }

  // Real implementation (uncomment once the `razorpay` npm package is added
  // and RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set):
  //
  // const Razorpay = (await import("razorpay")).default;
  // const instance = new Razorpay({ key_id: RAZORPAY_KEY_ID!, key_secret: RAZORPAY_KEY_SECRET! });
  // const order = await instance.orders.create({
  //   amount: params.amountPaise,
  //   currency: "INR",
  //   receipt: params.receipt,
  //   notes: params.notes,
  // });
  // return { id: order.id, amount: Number(order.amount), currency: "INR", receipt: params.receipt, status: order.status, mock: false };

  throw new Error(
    "RAZORPAY_MOCK_MODE is false but the real Razorpay call is not wired up yet — " +
      "install the razorpay package and implement createOrder()."
  );
}

/** Verify the signature returned to the client after a successful checkout. */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  if (RAZORPAY_MOCK_MODE) return true;

  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET!)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, params.razorpaySignature);
}

/** Verify the X-Razorpay-Signature header on an incoming webhook payload. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  if (RAZORPAY_MOCK_MODE) return true;
  if (!RAZORPAY_WEBHOOK_SECRET) return false;

  const expected = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signatureHeader);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

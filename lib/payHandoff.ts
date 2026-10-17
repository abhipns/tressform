// Tressform — "Pay from another phone" (17.10.2026, owner).
//
// A customer whose phone has no UPI app can show a QR code on the checkout
// page. Someone else scans it with their phone, which opens /pay?t=…, and
// PayU's payment page opens there for the same order. The customer's own
// checkout page watches the order and moves on by itself once it is paid.
//
// The link carries a signed token: which order, the mobile number PayU needs
// (Tressform does not store it), and an expiry. It is signed with the PayU
// salt, which never leaves the server, so a token can't be made up or
// changed. It only opens a payment for an order that is still unpaid, and
// it pays for that order only — the amount comes from the saved order.

import crypto from "crypto";

export const HANDOFF_MINUTES = 30;

export interface HandoffData {
  orderId: string;
  phone: string;
}

function secret(): string | null {
  const salt = process.env.PAYU_SALT?.trim();
  return salt ? `tressform-handoff:${salt}` : null;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function sign(body: string, key: string): string {
  return b64url(crypto.createHmac("sha256", key).update(body).digest());
}

/** A token for a payment link, or null when PayU isn't configured. */
export function makeHandoffToken(data: HandoffData, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const body = b64url(
    Buffer.from(JSON.stringify({ o: data.orderId, p: data.phone, x: Math.floor(now / 1000) + HANDOFF_MINUTES * 60 }))
  );
  return `${body}.${sign(body, key)}`;
}

/** The order and phone in a token — or null if it is changed, made up or out of date. */
export function readHandoffToken(token: string | null | undefined, now = Date.now()): HandoffData | null {
  const key = secret();
  if (!key || !token) return null;
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(body, key));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const d = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { o?: unknown; p?: unknown; x?: unknown };
    if (typeof d.o !== "string" || !/^[0-9a-f-]{36}$/i.test(d.o)) return null;
    if (typeof d.p !== "string" || !/^[6-9]\d{9}$/.test(d.p)) return null;
    if (typeof d.x !== "number" || d.x * 1000 < now) return null;
    return { orderId: d.o, phone: d.p };
  } catch {
    return null;
  }
}

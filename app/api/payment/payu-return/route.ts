// /api/payment/payu-return — where PayU sends the customer's browser after
// the payment page (PayU posts a form here for both success and failure).
//
// 12.10.2026. What PayU posts is not trusted: only the txnid is taken from
// it, and lib/payments.ts asks PayU directly whether that transaction was
// paid. Then the browser is sent on:
//   paid             → /results/<order>  ("Payment confirmed")
//   failed/cancelled → /checkout?tier=…&payment=failed  (try again)
//   still pending    → /results/<order>  (that page keeps checking)
//
// No login is needed here: the browser arrives from PayU's site, and the
// order is found by PayU's transaction id, not by who is asking.

import { NextRequest, NextResponse } from "next/server";
import { PAYU_MOCK_MODE, readPayuPost, responseHashOk } from "@/lib/integrations/payu";
import { confirmPayuTxn } from "@/lib/payments";

export const dynamic = "force-dynamic";

function go(req: NextRequest, path: string) {
  // 303 turns PayU's POST into a normal page visit (GET).
  return NextResponse.redirect(new URL(path, req.nextUrl.origin), 303);
}

export async function POST(req: NextRequest) {
  if (PAYU_MOCK_MODE) return go(req, "/");

  const post = await readPayuPost(req);
  const txnid = (post.txnid || "").trim();
  if (!txnid) return go(req, "/");
  if (post.hash && !responseHashOk(post)) {
    // Worth knowing about, but harmless: the order's fate is decided by PayU's own answer below.
    console.warn(`[Tressform] PayU return for ${txnid}: hash did not match.`);
  }

  try {
    const r = await confirmPayuTxn(txnid);
    if (!r.found) return go(req, "/");
    if (r.status === "FAILED") return go(req, `/checkout?tier=${r.tier ?? ""}&payment=failed`);
    return go(req, `/results/${r.orderId}`);
  } catch (err) {
    console.error(`[Tressform] PayU return for ${txnid}: could not confirm.`, err);
    // The results page re-checks with PayU when it loads, so send them there if we know the order.
    const orderId = (post.udf1 || "").trim();
    return go(req, /^[0-9a-f-]{36}$/i.test(orderId) ? `/results/${orderId}` : "/");
  }
}

export async function GET(req: NextRequest) {
  return go(req, "/");
}

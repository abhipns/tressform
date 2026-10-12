// /api/payment/payu-webhook — PayU's server tells us about a payment.
//
// 12.10.2026. Set this address in the PayU dashboard (Developers →
// Webhooks) for "Payment success" and "Payment failure":
//   https://www.tressform.co.in/api/payment/payu-webhook
// It matters when the customer pays but closes the tab before PayU sends
// the browser back: the previews are still added.
//
// As in payu-return, only the txnid is taken from the post; lib/payments.ts
// asks PayU itself what happened. Always answers 200 once the post has been
// read, so PayU doesn't keep retrying a transaction we can't match.

import { NextRequest, NextResponse } from "next/server";
import { PAYU_MOCK_MODE, readPayuPost } from "@/lib/integrations/payu";
import { confirmPayuTxn } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (PAYU_MOCK_MODE) return NextResponse.json({ ok: false, reason: "payments off" }, { status: 503 });

  const post = await readPayuPost(req);
  const txnid = (post.txnid || "").trim();
  if (!txnid) return NextResponse.json({ ok: true, ignored: "no txnid" });

  try {
    const r = await confirmPayuTxn(txnid);
    return NextResponse.json({ ok: true, status: r.found ? r.status : "unknown order" });
  } catch (err) {
    console.error(`[Tressform] PayU webhook for ${txnid}: could not confirm.`, err);
    // 500 so PayU retries later.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

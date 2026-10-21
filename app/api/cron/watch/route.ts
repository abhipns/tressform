// /api/cron/watch — the daily safety check (20.10.2026, owner's request).
//
// Vercel calls this once a day (see "crons" in vercel.json), with the
// CRON_SECRET password, like /api/cron/cleanup. Each run:
//
//   1. reads the fal.ai balance and emails / WhatsApps the owner if it is
//      under $10 (lib/falBalance.ts). Pictures also check it as they are
//      made; this run covers quiet days.
//   2. asks PayU about every order from the last three days that is still
//      unpaid here (at most 30). UPI payments are sometimes confirmed by
//      PayU minutes after the customer paid; if both the return page and the
//      webhook missed it, the customer would otherwise never get their
//      hairstyles. An order PayU says is paid is marked PAID, and the owner
//      is told which ones were found this way.
//   3. deletes the per-account usage counts (lib/usageLimits.ts) older than
//      three days.
//
// Every run leaves a row in job_runs ("watch").

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_MOCK_MODE, getSupabaseAdmin } from "@/lib/supabaseClient";
import { PAYU_MOCK_MODE } from "@/lib/integrations/payu";
import { confirmPayuTxn } from "@/lib/payments";
import { CREDIT_ONLY_TXN_PREFIX } from "@/lib/credit";
import { watchFalBalance } from "@/lib/falBalance";
import { sendOwnerAlert } from "@/lib/ownerAlerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ORDER_DAYS = 3;
const MAX_ORDERS = 30;
const USAGE_KEEP_DAYS = 3;

function passwordMatches(req: NextRequest, secret: string): boolean {
  const given = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ ok: true, skipped: "No database connected (mock mode)." });

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[Tressform] Daily watch did not run: CRON_SECRET is not set in Vercel.");
    return NextResponse.json({ ok: false, error: "The daily check isn't set up." }, { status: 503 });
  }
  if (!passwordMatches(req, secret)) return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 401 });

  const admin = getSupabaseAdmin();

  // 1. fal.ai balance.
  const balance = await watchFalBalance(admin, { force: true, reason: "daily check" });

  // 2. Unpaid orders PayU may have confirmed late.
  const late: string[] = [];
  let checked = 0;
  if (!PAYU_MOCK_MODE) {
    const since = new Date(Date.now() - ORDER_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: open } = await admin
      .from("orders")
      .select("id, razorpay_order_id, price_paise")
      .eq("status", "CREATED")
      .gte("created_at", since)
      .not("razorpay_order_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(MAX_ORDERS);
    for (const o of (open ?? []) as { id: string; razorpay_order_id: string; price_paise: number }[]) {
      if (o.razorpay_order_id.startsWith(CREDIT_ONLY_TXN_PREFIX)) continue;
      checked += 1;
      try {
        const r = await confirmPayuTxn(o.razorpay_order_id, "check");
        if (r.found && r.status === "PAID") late.push(`${o.razorpay_order_id} (₹${Math.round(o.price_paise / 100)})`);
      } catch (err) {
        console.error(`[Tressform] Daily watch: PayU check of ${o.razorpay_order_id} failed:`, (err as Error)?.message ?? err);
      }
    }
    if (late.length > 0) {
      await sendOwnerAlert(
        `${late.length} payment(s) found late and marked paid`,
        "PayU confirmed these payments, but Tressform hadn't recorded them until today's check. " +
          "The customers can now see their hairstyles. Check whether any of them paid twice:\n\n" +
          late.join("\n")
      );
    }
  }

  // 3. Old usage counts.
  const cutoff = new Date(Date.now() - USAGE_KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: pruneError } = await admin.from("job_runs").delete().like("job", "usage:%").lt("ran_at", cutoff);
  if (pruneError) console.error("[Tressform] Daily watch: pruning usage rows failed:", pruneError.message);

  const summary = {
    balance: balance && balance.ok ? balance.balance : null,
    balanceProblem: balance && !balance.ok ? balance.reason : null,
    ordersChecked: checked,
    foundPaidLate: late.length,
  };
  const { error: recordError } = await admin.from("job_runs").insert({ job: "watch", summary });
  if (recordError) console.error("[Tressform] Daily watch: job_runs insert failed:", recordError.message);

  return NextResponse.json({ ok: true, ...summary });
}

// /api/referral/me — the signed-in customer's own referral link and credit,
// for the card on /refer (14.10.2026). POST so the demo (no database) can
// send its demo user id, same as /api/reviews/mine.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { mockStore } from "@/lib/mockStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const auth = await requireUser(req, typeof body.userId === "string" ? body.userId : null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (SUPABASE_MOCK_MODE) {
    const me = mockStore.getOrCreateProfile(auth.userId);
    const mine = [...mockStore.referrals.values()].filter((r) => r.referrerId === auth.userId);
    return NextResponse.json({
      code: me.referralCode,
      balancePaise: me.creditBalancePaise,
      joined: mine.length,
      bought: mine.filter((r) => r.firstPurchaseOrderId).length,
      earnedPaise: mine.reduce((s, r) => s + r.creditsPaise, 0),
    });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const [{ data: me, error }, { data: mine }] = await Promise.all([
    db.from("profiles").select("referral_code, credit_balance_paise").eq("id", auth.userId).maybeSingle(),
    db.from("referrals").select("first_purchase_qualified, credits_paise").eq("referrer_id", auth.userId),
  ]);
  if (error || !me) return NextResponse.json({ error: "Couldn't load your referral link." }, { status: 500 });
  const rows = mine ?? [];
  return NextResponse.json({
    code: me.referral_code,
    balancePaise: me.credit_balance_paise ?? 0,
    joined: rows.length,
    bought: rows.filter((r) => r.first_purchase_qualified).length,
    earnedPaise: rows.reduce((s, r) => s + (r.credits_paise ?? 0), 0),
  });
}

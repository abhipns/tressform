// /api/referral/me — the signed-in customer's own referral link and credit,
// for the card on /refer (14.10.2026). POST so the demo (no database) can
// send its demo user id, same as /api/reviews/mine.
//
// 26.10.2026: also the visitors their link has brought and the credit that
// has earned (lib/linkVisits.ts). The page sends this device's anonymous
// visitor id, which is noted as the customer's own, so their own visits
// through their link never count.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { mockStore } from "@/lib/mockStore";
import { VISITOR_PATTERN } from "@/lib/linkVisits";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const auth = await requireUser(req, typeof body.userId === "string" ? body.userId : null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const visitor = typeof body.visitor === "string" && VISITOR_PATTERN.test(body.visitor) ? body.visitor : null;

  if (SUPABASE_MOCK_MODE) {
    const me = mockStore.getOrCreateProfile(auth.userId);
    const mine = [...mockStore.referrals.values()].filter((r) => r.referrerId === auth.userId);
    if (visitor) mockStore.sharerDevices.add(`${auth.userId}:${visitor}`);
    return NextResponse.json({
      code: me.referralCode,
      balancePaise: me.creditBalancePaise,
      joined: mine.length,
      bought: mine.filter((r) => r.firstPurchaseOrderId).length,
      earnedPaise: mine.reduce((s, r) => s + r.creditsPaise, 0),
      linkVisitors: [...mockStore.linkVisits.values()].filter((v) => v.code === me.referralCode).length,
      linkEarnedPaise: [...mockStore.linkRewards.values()].filter((r) => r.code === me.referralCode).reduce((s, r) => s + r.creditsPaise, 0),
      linkCanEarn: [...mockStore.orders.values()].some((o) => o.userId === auth.userId && o.status === "PAID"),
    });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const [{ data: me, error }, { data: mine }, { count: linkVisitors }, { data: linkRewards }, { data: paid }] = await Promise.all([
    db.from("profiles").select("referral_code, credit_balance_paise").eq("id", auth.userId).maybeSingle(),
    db.from("referrals").select("first_purchase_qualified, credits_paise").eq("referrer_id", auth.userId),
    db.from("referral_link_visits").select("visitor", { count: "exact", head: true }).eq("referrer_id", auth.userId),
    db.from("referral_link_rewards").select("credits_paise").eq("referrer_id", auth.userId),
    db.from("orders").select("id").eq("user_id", auth.userId).eq("status", "PAID").limit(1),
  ]);
  if (error || !me) return NextResponse.json({ error: "Couldn't load your referral link." }, { status: 500 });
  // Best-effort: this device is the customer's own, so its visits through their link never count.
  if (visitor) {
    await db
      .from("referral_sharer_devices")
      .upsert({ user_id: auth.userId, visitor }, { onConflict: "user_id,visitor", ignoreDuplicates: true })
      .then(({ error: e }) => e && console.error("[Tressform] sharer device not noted:", e.message));
  }
  const rows = mine ?? [];
  return NextResponse.json({
    code: me.referral_code,
    balancePaise: me.credit_balance_paise ?? 0,
    joined: rows.length,
    bought: rows.filter((r) => r.first_purchase_qualified).length,
    earnedPaise: rows.reduce((s, r) => s + (r.credits_paise ?? 0), 0),
    linkVisitors: linkVisitors ?? 0,
    linkEarnedPaise: (linkRewards ?? []).reduce((s: number, r: { credits_paise: number | null }) => s + (r.credits_paise ?? 0), 0),
    linkCanEarn: Boolean(paid && paid.length > 0),
  });
}

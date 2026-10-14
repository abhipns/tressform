// /api/admin/stats — the numbers for the owner's dashboard (13.10.2026).
// OWNER ONLY. ?period=today|7|30|all. The owner's own test activity (the
// ADMIN account) is left out of every number. The work is done by the
// database function admin_stats().
//
// 14.10.2026: also `committed` — AI cost customers have already paid for but
// that hasn't been spent yet (lib/stats.ts, committedCost). It is a figure
// for right now, not for the chosen period.
//
// 14.10.2026: also `gst` for the final summary — the GST charged on this
// period's paid orders (saved with each order; 0 while Tressform isn't
// GST-registered, lib/pricing.ts GST_REGISTERED), and, for planning, what
// it would be at 18% of the same sales if prices stayed as they are.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { committedCost, periodStart, type Period } from "@/lib/stats";
import { FALAI_COST_PER_IMAGE_PAISE } from "@/lib/integrations/falai";
import { GST_RATE, GST_REGISTERED } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const EMPTY = {
  visitors: 0,
  page_views: 0,
  returning_visitors: 0,
  signups: 0,
  selfies: 0,
  selfie_people: 0,
  hairstyles_made: 0,
  orders: 0,
  buyers: 0,
  repeat_buyers: 0,
  revenue_paise: 0,
  credit_used_paise: 0,
  fees_paise: 0,
  ai_cost_paise: 0,
  by_pack: {},
  product_clicks: [],
  shop_clicks: {},
  ratings: {},
  affiliate_income_paise: 0,
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, SUPABASE_MOCK_MODE ? "demo-owner" : null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const p = req.nextUrl.searchParams.get("period");
  const period: Period = p === "today" || p === "7" || p === "30" || p === "all" ? p : "30";
  const since = periodStart(period, new Date());

  if (SUPABASE_MOCK_MODE) {
    return NextResponse.json({
      period,
      since,
      stats: EMPTY,
      income: [],
      committed: committedCost(0, 0, FALAI_COST_PER_IMAGE_PAISE),
      gst: { registered: GST_REGISTERED, duePaise: 0, ifRegisteredPaise: 0 },
    });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const [{ data, error }, { data: income }] = await Promise.all([
    db.rpc("admin_stats", { p_since: since }),
    db.from("affiliate_income").select("id, month, source, amount_paise, note").order("month", { ascending: false }).limit(36),
  ]);
  if (error) return NextResponse.json({ error: "Couldn't load the numbers." }, { status: 500 });

  // Committed AI cost, customers only (the owner's own test looks are left out).
  const { data: admins } = await db.from("profiles").select("id").eq("role", "ADMIN");
  const adminIds = new Set((admins ?? []).map((a) => a.id as string));
  const [{ data: unopened }, { data: paidOrders }] = await Promise.all([
    db.from("style_results").select("user_id").not("order_id", "is", null).eq("status", "SUCCEEDED").is("view_paths", null).limit(10000),
    db.from("orders").select("user_id, preview_count, previews_used, gst_paise, paid_at").eq("status", "PAID").limit(10000),
  ]);
  const customerOrders = (paidOrders ?? []).filter((o) => !adminIds.has(o.user_id as string));
  const gstDuePaise = customerOrders
    .filter((o) => o.paid_at && (o.paid_at as string) >= since)
    .reduce((sum, o) => sum + (o.gst_paise ?? 0), 0);
  const revenuePaise = Number((data as { revenue_paise?: number } | null)?.revenue_paise ?? 0);
  const unopenedLooks = (unopened ?? []).filter((r) => !adminIds.has(r.user_id as string)).length;
  const unmadeLooks = customerOrders.reduce((sum, o) => sum + Math.max(0, (o.preview_count ?? 0) - (o.previews_used ?? 0)), 0);

  return NextResponse.json({
    period,
    since,
    stats: { ...EMPTY, ...(data ?? {}) },
    income: income ?? [],
    committed: committedCost(unopenedLooks, unmadeLooks, FALAI_COST_PER_IMAGE_PAISE),
    gst: { registered: GST_REGISTERED, duePaise: gstDuePaise, ifRegisteredPaise: Math.round(revenuePaise * GST_RATE) },
  });
}

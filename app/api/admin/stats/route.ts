// /api/admin/stats — the numbers for the owner's dashboard (13.10.2026).
// OWNER ONLY. ?period=today|7|30|all. The owner's own test activity (the
// ADMIN account) is left out of every number. The work is done by the
// database function admin_stats().

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { periodStart, type Period } from "@/lib/stats";

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

  if (SUPABASE_MOCK_MODE) return NextResponse.json({ period, since, stats: EMPTY, income: [] });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const [{ data, error }, { data: income }] = await Promise.all([
    db.rpc("admin_stats", { p_since: since }),
    db.from("affiliate_income").select("id, month, source, amount_paise, note").order("month", { ascending: false }).limit(36),
  ]);
  if (error) return NextResponse.json({ error: "Couldn't load the numbers." }, { status: 500 });
  return NextResponse.json({ period, since, stats: { ...EMPTY, ...(data ?? {}) }, income: income ?? [] });
}

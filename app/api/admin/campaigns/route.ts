// /api/admin/campaigns?period=… — visits, purchases and money by ad
// campaign, for the owner's Dashboard (21.10.2026). OWNER ONLY.
//
// A row per (source, campaign): people who came from it (distinct visitors),
// paid orders and the money they paid, in the period. The owner's own test
// orders are left out, as everywhere on the Dashboard.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/serverAuth";
import { periodStart, type Period } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const p = req.nextUrl.searchParams.get("period");
  const period: Period = p === "today" || p === "7" || p === "30" || p === "all" ? p : "30";
  const since = periodStart(period, new Date());

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const [{ data: visits, error: vErr }, { data: orders, error: oErr }, { data: owners }] = await Promise.all([
    db.from("site_visits").select("visitor, utm_source, utm_campaign").not("utm_source", "is", null).gte("created_at", since).limit(50000),
    db.from("orders").select("user_id, utm_source, utm_campaign, price_paise").eq("status", "PAID").not("utm_source", "is", null).gte("paid_at", since).limit(10000),
    db.from("profiles").select("id").eq("role", "ADMIN"),
  ]);
  if (vErr || oErr) {
    // Most likely the database step for campaigns hasn't been run yet.
    return NextResponse.json({ rows: [], notReady: true, error: (vErr ?? oErr)?.message });
  }
  const ownerIds = new Set((owners ?? []).map((o) => o.id));

  const rows = new Map<string, { source: string; campaign: string; visitors: Set<string>; purchases: number; revenuePaise: number }>();
  const row = (source: string, campaign: string | null) => {
    const c = campaign || "(no campaign name)";
    const k = `${source}|${c}`;
    if (!rows.has(k)) rows.set(k, { source, campaign: c, visitors: new Set(), purchases: 0, revenuePaise: 0 });
    return rows.get(k)!;
  };
  for (const v of visits ?? []) row(v.utm_source, v.utm_campaign).visitors.add(v.visitor);
  for (const o of orders ?? []) {
    if (ownerIds.has(o.user_id)) continue;
    const r = row(o.utm_source, o.utm_campaign);
    r.purchases += 1;
    r.revenuePaise += o.price_paise ?? 0;
  }
  return NextResponse.json({
    rows: Array.from(rows.values())
      .map((r) => ({ source: r.source, campaign: r.campaign, visitors: r.visitors.size, purchases: r.purchases, revenuePaise: r.revenuePaise }))
      .sort((a, b) => b.revenuePaise - a.revenuePaise || b.visitors - a.visitors),
  });
}

// /api/visit — counts a page visit for the owner's dashboard (13.10.2026).
//
// No cookies and nothing personal: the browser sends a random id it made up
// itself (kept on the device), the page's path and, if the visitor came from
// another site, that site's name. Search-engine robots are not counted.
// The owner's admin pages are not counted either (the browser doesn't send them).
//
// 14.10.2026: limited per visitor id (lib/stats.ts, shouldCountVisit): the
// same page once per half hour, at most 60 pages a day.

import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { VISITS_PER_VISITOR_PER_DAY, looksLikeRobot, shouldCountVisit } from "@/lib/stats";
import { campaignColumns } from "@/lib/campaign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (looksLikeRobot(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const visitor = typeof body.visitor === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.visitor) ? body.visitor : null;
  const rawPath = typeof body.path === "string" ? body.path : "/";
  const path = rawPath.startsWith("/") ? rawPath.split(/[?#]/)[0].slice(0, 200) : "/";
  const ref = typeof body.ref === "string" ? body.ref.toLowerCase().replace(/^www\./, "").slice(0, 120) : "";
  if (!visitor || path.startsWith("/admin")) return new NextResponse(null, { status: 204 });
  if (SUPABASE_MOCK_MODE) return new NextResponse(null, { status: 204 });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const { data: recent } = await db
    .from("site_visits")
    .select("path, created_at")
    .eq("visitor", visitor)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(VISITS_PER_VISITOR_PER_DAY);
  if (!shouldCountVisit(path, recent ?? [], new Date())) return new NextResponse(null, { status: 204 });
  const row = { visitor, path, referrer_host: /^[a-z0-9.-]+$/.test(ref) && ref !== "tressform.co.in" ? ref : null };
  // 21.10.2026: with the ad campaign that brought this visitor, if any —
  // or without it, if the database doesn't have the campaign columns yet.
  const { error } = await db.from("site_visits").insert({ ...row, ...campaignColumns(body.campaign) });
  if (error && /utm_|column/i.test(error.message ?? "")) await db.from("site_visits").insert(row);
  return new NextResponse(null, { status: 204 });
}

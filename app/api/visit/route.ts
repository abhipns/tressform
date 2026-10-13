// /api/visit — counts a page visit for the owner's dashboard (13.10.2026).
//
// No cookies and nothing personal: the browser sends a random id it made up
// itself (kept on the device), the page's path and, if the visitor came from
// another site, that site's name. Search-engine robots are not counted.
// The owner's admin pages are not counted either (the browser doesn't send them).

import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|monitor/i;

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const visitor = typeof body.visitor === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.visitor) ? body.visitor : null;
  const rawPath = typeof body.path === "string" ? body.path : "/";
  const path = rawPath.startsWith("/") ? rawPath.split(/[?#]/)[0].slice(0, 200) : "/";
  const ref = typeof body.ref === "string" ? body.ref.toLowerCase().replace(/^www\./, "").slice(0, 120) : "";
  if (!visitor || path.startsWith("/admin")) return new NextResponse(null, { status: 204 });
  if (SUPABASE_MOCK_MODE) return new NextResponse(null, { status: 204 });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  await getSupabaseAdmin()
    .from("site_visits")
    .insert({ visitor, path, referrer_host: /^[a-z0-9.-]+$/.test(ref) && ref !== "tressform.co.in" ? ref : null });
  return new NextResponse(null, { status: 204 });
}

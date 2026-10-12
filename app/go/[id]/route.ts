// /go/[id] — a "buy" button on Tressform: count the tap, then open the shop.
//
// 12.10.2026. Every product link on the site points here instead of
// straight at the shop, so the owner can see which suggestions people
// actually tap. Only the product, the card's hairstyle and where on the
// site it was tapped are kept — not who tapped it. Then the visitor is sent
// to the owner's affiliate link. Unknown or switched-off products go to the
// Hair Care page instead.

import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: string | null, max: number) => (v ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, max) || null;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const fallback = new URL("/haircare", req.url);
  const noIndex = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

  if (SUPABASE_MOCK_MODE) {
    return NextResponse.redirect("https://example.com/?demo-product=" + encodeURIComponent(params.id), { status: 302, headers: noIndex });
  }
  if (!UUID.test(params.id)) return NextResponse.redirect(fallback, { status: 302, headers: noIndex });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("affiliate_products")
    .select("id, earnkaro_tracked_url, is_active")
    .eq("id", params.id)
    .maybeSingle();
  const link = data?.is_active ? String(data.earnkaro_tracked_url ?? "") : "";
  if (!/^https:\/\//i.test(link)) return NextResponse.redirect(fallback, { status: 302, headers: noIndex });

  const sp = req.nextUrl.searchParams;
  const { error } = await db
    .from("affiliate_clicks")
    .insert({ product_id: data!.id, style_id: clean(sp.get("style"), 60), placement: clean(sp.get("from"), 30) });
  if (error) console.error("[Tressform] click not recorded:", error.message);

  return NextResponse.redirect(link, { status: 302, headers: noIndex });
}

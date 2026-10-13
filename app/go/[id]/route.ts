// /go/[id] — a shop button on Tressform: count the tap, then open the shop.
//
// 12.10.2026. Every product button points here instead of straight at the
// shop, so the owner can see which suggestions people tap. Only the
// product, the shop, the card's hairstyle and where on the site it was
// tapped are kept — not who tapped it. Then the visitor goes to the
// owner's affiliate link for that shop.
//
// 13.10.2026: several shops per product (?shop=amazon|flipkart|nykaa|…).
// Amazon links are built from the product code with the owner's Associate
// ID. With no ?shop (or a shop the product isn't sold at), the first shop
// the product has is used. Unknown or switched-off products go to the
// Hair Care page instead.

import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { SHOP_IDS, type ShopId } from "@/lib/content/haircare";
import { shopLinksOf } from "@/lib/haircareProducts";
import type { AffiliateProductRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: string | null, max: number) => (v ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, max) || null;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const fallback = new URL("/haircare", req.url);
  const noIndex = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };
  const sp = req.nextUrl.searchParams;
  const asked = (sp.get("shop") ?? "") as ShopId;

  if (SUPABASE_MOCK_MODE) {
    return NextResponse.redirect(`https://example.com/?demo-product=${encodeURIComponent(params.id)}&shop=${encodeURIComponent(asked)}`, { status: 302, headers: noIndex });
  }
  if (!UUID.test(params.id)) return NextResponse.redirect(fallback, { status: 302, headers: noIndex });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const { data } = await db.from("affiliate_products").select("*").eq("id", params.id).maybeSingle();
  if (!data?.is_active) return NextResponse.redirect(fallback, { status: 302, headers: noIndex });

  const links = shopLinksOf(data as AffiliateProductRow);
  const shop: ShopId | undefined = SHOP_IDS.includes(asked) && links[asked] ? asked : SHOP_IDS.find((id) => links[id]);
  const link = shop ? links[shop] : undefined;
  if (!shop || !link || !/^https:\/\//i.test(link)) return NextResponse.redirect(fallback, { status: 302, headers: noIndex });

  const { error } = await db.from("affiliate_clicks").insert({
    product_id: data.id,
    shop,
    style_id: clean(sp.get("style"), 60),
    placement: clean(sp.get("from"), 30),
  });
  if (error) console.error("[Tressform] click not recorded:", error.message);

  return NextResponse.redirect(link, { status: 302, headers: noIndex });
}

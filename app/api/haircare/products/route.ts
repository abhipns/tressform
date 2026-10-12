// /api/haircare/products — the active hair-care products, for the cards.
// Public: names, kinds and shops only (the buy link goes through /go/[id]).

import { NextResponse } from "next/server";
import { loadCareProducts } from "@/lib/haircareProducts";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await loadCareProducts();
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}

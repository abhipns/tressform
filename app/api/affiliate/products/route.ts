// GET /api/affiliate/products
// Returns the "Maintain Your Look" affiliate product list (Part J). EarnKaro
// has no live catalog feed, so this table is manually curated content-ops
// data (see lib/integrations/earnkaro.ts) — this route just serves it.

import { NextResponse } from "next/server";
import { getSupabaseAdmin, SUPABASE_MOCK_MODE } from "@/lib/supabaseClient";

const MOCK_PRODUCTS = [
  {
    id: "mock-1",
    title: "Sulphate-Free Shampoo",
    description: "Gentle daily shampoo — placeholder product, replace via content-ops curation.",
    imageUrl: "https://placehold.co/400x400/png?text=Shampoo",
    trackedUrl: "https://example.com/shampoo?mock_earnkaro_ref=tressform",
    category: "Hair Care",
    pricePaise: 34900,
  },
  {
    id: "mock-2",
    title: "Argan Oil Hair Serum",
    description: "Lightweight frizz-control serum — placeholder product.",
    imageUrl: "https://placehold.co/400x400/png?text=Hair+Serum",
    trackedUrl: "https://example.com/serum?mock_earnkaro_ref=tressform",
    category: "Hair Care",
    pricePaise: 59900,
  },
  {
    id: "mock-3",
    title: "Ceramic Round Brush",
    description: "Volumizing blow-dry brush — placeholder product.",
    imageUrl: "https://placehold.co/400x400/png?text=Round+Brush",
    trackedUrl: "https://example.com/brush?mock_earnkaro_ref=tressform",
    category: "Styling Tools",
    pricePaise: 79900,
  },
];

export async function GET() {
  if (SUPABASE_MOCK_MODE) {
    return NextResponse.json({ products: MOCK_PRODUCTS, mock: true });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("affiliate_products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: `Failed to load affiliate products: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ products: data, mock: false });
}

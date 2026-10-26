// Tressform — reading the hair-care products for the site. Server-only.
//
// 12.10.2026. The owner adds products on /admin/products (stored in
// affiliate_products). This reads the active ones, in the owner's order.
// Without a database (the local demo), a few clearly-fake example products
// stand in so the cards can be tried; they never appear on the live site.

import type { CareProduct, ProductKind, ShopId } from "./content/haircare";
import { KIND_IDS, SHOP_IDS, amazonLink } from "./content/haircare";
import { SUPABASE_MOCK_MODE } from "./serverAuth";
import type { AffiliateProductRow } from "./database.types";

const DEMO: CareProduct[] = [
  { id: "demo-1", title: "Example mild shampoo", brand: "Demo", kind: "shampoo-mild", shops: ["amazon", "flipkart", "nykaa"], gender: "all", hairTypes: [], note: null, image: null },
  { id: "demo-2", title: "Example sulphate-free shampoo", brand: "Demo", kind: "shampoo-sulphate-free", shops: ["nykaa", "amazon"], gender: "all", hairTypes: ["wavy", "curly"], note: null, image: null },
  { id: "demo-3", title: "Example matte clay", brand: "Demo", kind: "matte-clay", shops: ["amazon", "flipkart", "nykaa"], gender: "men", hairTypes: [], note: "Light hold, no shine", image: null, trending: true },
  { id: "demo-4", title: "Example conditioner", brand: "Demo", kind: "conditioner", shops: ["amazon", "flipkart", "nykaa"], gender: "all", hairTypes: [], note: null, image: null },
  { id: "demo-5", title: "Example curl cream", brand: "Demo", kind: "curl-cream", shops: ["nykaa", "amazon"], gender: "all", hairTypes: ["wavy", "curly"], note: null, image: null, trending: true },
  { id: "demo-6", title: "Example hair serum", brand: "Demo", kind: "serum", shops: ["amazon", "flipkart", "nykaa"], gender: "women", hairTypes: [], note: null, image: null },
];

/** Where each shop's button goes for this product; only shops with a usable link. */
export function shopLinksOf(r: AffiliateProductRow): Partial<Record<ShopId, string>> {
  const out: Partial<Record<ShopId, string>> = {};
  if (r.amazon_asin) out.amazon = amazonLink(r.amazon_asin);
  const links = (r.shop_links ?? {}) as Record<string, unknown>;
  for (const id of SHOP_IDS) {
    const link = links[id];
    if (id !== "amazon" && typeof link === "string" && /^https:\/\//i.test(link)) out[id] = link;
  }
  // Products added before 13.10.2026 have one link and a shop name.
  if (r.earnkaro_tracked_url && /^https:\/\//i.test(r.earnkaro_tracked_url)) {
    const legacy = (r.store ?? "").toLowerCase() as ShopId;
    const id: ShopId = SHOP_IDS.includes(legacy) ? legacy : "brand";
    if (!out[id]) out[id] = r.earnkaro_tracked_url;
  }
  return out;
}

export function rowToProduct(r: AffiliateProductRow): CareProduct | null {
  const kind = (r.kind ?? "") as ProductKind;
  if (!KIND_IDS.includes(kind)) return null;
  const links = shopLinksOf(r);
  const shops = SHOP_IDS.filter((id) => links[id]);
  if (shops.length === 0) return null;
  return {
    id: r.id,
    title: r.title,
    brand: r.brand,
    kind,
    shops,
    gender: r.gender ?? "all",
    hairTypes: (r.hair_types ?? []).filter((t): t is CareProduct["hairTypes"][number] => ["straight", "wavy", "curly"].includes(t)),
    note: r.description,
    image: r.image_url && /^https:\/\//i.test(r.image_url) ? r.image_url : null,
    trending: r.is_trending === true,
    pricePaise: Number.isInteger(r.price_paise) && (r.price_paise as number) > 0 ? r.price_paise : null,
  };
}

export async function loadCareProducts(): Promise<CareProduct[]> {
  if (SUPABASE_MOCK_MODE) return DEMO;
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { data, error } = await getSupabaseAdmin()
    .from("affiliate_products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[Tressform] hair-care products:", error.message);
    return [];
  }
  return (data as AffiliateProductRow[]).map(rowToProduct).filter((p): p is CareProduct => p !== null);
}

/**
 * 26.10.2026: taps on each product's buy buttons in the last 30 days
 * (product id → taps), for the Trending strip when the owner hasn't ticked
 * any. Only product ids are read, never who tapped.
 */
export async function loadTaps30(): Promise<Record<string, number>> {
  if (SUPABASE_MOCK_MODE) return {};
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("affiliate_clicks")
    .select("product_id")
    .gte("created_at", since)
    .limit(50000);
  if (error) {
    console.error("[Tressform] product taps:", error.message);
    return {};
  }
  const count: Record<string, number> = {};
  for (const c of data ?? []) count[c.product_id] = (count[c.product_id] ?? 0) + 1;
  return count;
}

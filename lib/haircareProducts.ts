// Tressform — reading the hair-care products for the site. Server-only.
//
// 12.10.2026. The owner adds products on /admin/products (stored in
// affiliate_products). This reads the active ones, in the owner's order.
// Without a database (the local demo), a few clearly-fake example products
// stand in so the cards can be tried; they never appear on the live site.

import type { CareProduct, ProductKind } from "@/lib/content/haircare";
import { KIND_IDS } from "@/lib/content/haircare";
import { SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import type { AffiliateProductRow } from "@/lib/database.types";

const DEMO: CareProduct[] = [
  { id: "demo-1", title: "Example mild shampoo", brand: "Demo", kind: "shampoo-mild", store: "Amazon", gender: "all", hairTypes: [], note: null },
  { id: "demo-2", title: "Example sulphate-free shampoo", brand: "Demo", kind: "shampoo-sulphate-free", store: "Nykaa", gender: "all", hairTypes: ["wavy", "curly"], note: null },
  { id: "demo-3", title: "Example matte clay", brand: "Demo", kind: "matte-clay", store: "Amazon", gender: "men", hairTypes: [], note: "Light hold, no shine" },
  { id: "demo-4", title: "Example conditioner", brand: "Demo", kind: "conditioner", store: "Amazon", gender: "all", hairTypes: [], note: null },
  { id: "demo-5", title: "Example curl cream", brand: "Demo", kind: "curl-cream", store: "Nykaa", gender: "all", hairTypes: ["wavy", "curly"], note: null },
  { id: "demo-6", title: "Example hair serum", brand: "Demo", kind: "serum", store: "Amazon", gender: "women", hairTypes: [], note: null },
];

export function rowToProduct(r: AffiliateProductRow): CareProduct | null {
  const kind = (r.kind ?? "") as ProductKind;
  if (!KIND_IDS.includes(kind)) return null;
  return {
    id: r.id,
    title: r.title,
    brand: r.brand,
    kind,
    store: r.store,
    gender: r.gender ?? "all",
    hairTypes: (r.hair_types ?? []).filter((t): t is CareProduct["hairTypes"][number] => ["straight", "wavy", "curly"].includes(t)),
    note: r.description,
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

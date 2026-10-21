// /api/salons/search — approved salons for customers (21.10.2026).
//
// GET ?city=&type=MEN|WOMEN|UNISEX&spec=FADE&style=<hairstyle id>
//   → { salons: [...cards], cities: [{ city, count }], total, yourCity, match }
// GET ?summary=1 → { total } only: the homepage and the results page show
//   "Find a salon" / "Get this look at a salon" only once at least one salon
//   has been approved, so nobody lands on an empty list.
//
// Only ACTIVE (approved) salons, and only what the public profile shows.
// With ?style=, salons good at what that haircut needs come first
// (lib/salonMatch.ts), and they must serve the customer's gender.
// `yourCity`: the city the visitor's connection appears to be in (Vercel's
// guess from the internet address — approximate), used to pre-select the
// city when there are salons there.

import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { CUSTOMER_TYPES, SPECIALITIES, salonPhotoUrl } from "@/lib/salons";
import { matchScore, styleMatchFor } from "@/lib/salonMatch";

export const dynamic = "force-dynamic";

export interface SalonListItem {
  slug: string;
  name: string;
  area: string;
  city: string;
  marketTier: string;
  customerTypes: string[];
  specialities: string[];
  priceFrom: number | null;
  photo: string | null;
  verified: boolean;
  matched: string[];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ salons: [], cities: [], total: 0, yourCity: null, match: null });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  if (q.get("summary") === "1") {
    const { count } = await admin.from("salons").select("id", { count: "exact", head: true }).eq("status", "ACTIVE");
    return NextResponse.json({ total: count ?? 0 }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  }

  const { data: rows, error } = await admin
    .from("salons")
    .select("id, slug, name, area, city, market_tier, customer_types, specialities, price_men_rupees, price_women_rupees, price_unisex_rupees, verification_status, approved_at")
    .eq("status", "ACTIVE")
    .order("approved_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: "We couldn't load salons. Please try again." }, { status: 500 });
  const all = rows ?? [];

  // Cities with approved salons, most salons first.
  const byCity = new Map<string, { city: string; count: number }>();
  for (const r of all) {
    const k = norm(r.city ?? "");
    if (!k) continue;
    const e = byCity.get(k) ?? { city: (r.city ?? "").trim(), count: 0 };
    e.count += 1;
    byCity.set(k, e);
  }
  const cities = Array.from(byCity.values()).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

  const guess = decodeURIComponent(req.headers.get("x-vercel-ip-city") || "");
  const yourCity = guess && byCity.has(norm(guess)) ? byCity.get(norm(guess))!.city : null;

  const match = styleMatchFor(q.get("style"));
  const city = norm(q.get("city") || "");
  const type = (q.get("type") || "").toUpperCase();
  const spec = (q.get("spec") || "").toUpperCase();
  const types = match ? match.customerTypes : CUSTOMER_TYPES.some((c) => c.id === type) ? (type === "UNISEX" ? ["UNISEX"] : [type, "UNISEX"]) : null;
  const wanted = match ? match.specialities : SPECIALITIES.some((s) => s.id === spec) ? [spec] : [];

  const picked = all
    .filter((r) => !city || norm(r.city ?? "") === city)
    .filter((r) => !types || (r.customer_types ?? []).some((t: string) => types.includes(t)))
    .filter((r) => match || wanted.length === 0 || matchScore(r.specialities ?? [], wanted) > 0)
    .map((r) => {
      const prices = [r.price_men_rupees, r.price_women_rupees, r.price_unisex_rupees].filter((p): p is number => typeof p === "number");
      const item: SalonListItem = {
        slug: r.slug,
        name: r.name,
        area: r.area ?? "",
        city: r.city ?? "",
        marketTier: r.market_tier,
        customerTypes: r.customer_types ?? [],
        specialities: r.specialities ?? [],
        priceFrom: prices.length ? Math.min(...prices) : null,
        photo: null,
        verified: r.verification_status !== "PENDING",
        matched: (r.specialities ?? []).filter((s: string) => wanted.includes(s)),
      };
      return { id: r.id as string, item, score: matchScore(r.specialities ?? [], wanted) };
    })
    // Best match first; then verified salons; then newest.
    .sort((a, b) => b.score - a.score || Number(b.item.verified) - Number(a.item.verified))
    .slice(0, 60);

  // One photo per salon: the outside, else the first one.
  if (picked.length) {
    const { data: imgs } = await admin
      .from("salon_images")
      .select("salon_id, storage_path, image_type, sort_order")
      .in("salon_id", picked.map((p) => p.id))
      .order("sort_order");
    for (const p of picked) {
      const mine = (imgs ?? []).filter((i) => i.salon_id === p.id);
      const pic = mine.find((i) => i.image_type === "EXTERIOR") ?? mine[0];
      p.item.photo = pic ? salonPhotoUrl(pic.storage_path) : null;
    }
  }

  return NextResponse.json({
    salons: picked.map((p) => p.item),
    cities,
    total: all.length,
    yourCity,
    match: match ? { styleId: match.style.id, styleName: match.style.name, specialities: match.specialities } : null,
  });
}

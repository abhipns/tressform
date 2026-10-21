// /api/admin/salons — the site owner's list of salon submissions
// (21.10.2026). OWNER ONLY (requireAdmin).
//
// GET  → every salon, newest first, with its photos, and the onboarding
//        counts for the last 30 days (started → step 1 → 2 → 3 → finished).
// POST → { id, action, note? }:
//   approve   — the salon goes live (status ACTIVE)
//   suspend   — hidden from the public (status SUSPENDED)
//   pending   — back to "under review"
//   verify / quality / unverify — the verification badge
//   note      — "changes needed": a note the salon owner sees on their profile

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/serverAuth";
import { salonPhotoUrl, SALON_EVENTS } from "@/lib/salons";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const { data: salons, error } = await admin.from("salons").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (salons ?? []).map((s) => s.id);
  const [{ data: images }, { data: stylists }] = ids.length
    ? await Promise.all([
        admin.from("salon_images").select("salon_id, storage_path, image_type, sort_order").in("salon_id", ids).order("sort_order"),
        admin.from("salon_stylists").select("salon_id").in("salon_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const counts: Record<string, number> = {};
  await Promise.all(
    SALON_EVENTS.map(async (event) => {
      const { count } = await admin.from("salon_events").select("id", { count: "exact", head: true }).eq("event", event).gte("created_at", since);
      counts[event] = count ?? 0;
    })
  );

  return NextResponse.json({
    counts,
    salons: (salons ?? []).map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      owner: s.owner_manager_name,
      mobile: s.mobile,
      whatsapp: s.whatsapp,
      email: s.email,
      instagram: s.instagram_handle,
      city: s.city,
      area: s.area,
      address: s.address,
      mapsUrl: s.maps_url,
      customerTypes: s.customer_types,
      marketTier: s.market_tier,
      services: s.services,
      specialities: s.specialities,
      prices: { men: s.price_men_rupees, women: s.price_women_rupees, unisex: s.price_unisex_rupees, advanced: s.price_advanced_rupees },
      status: s.status,
      verification: s.verification_status,
      adminNote: s.admin_note,
      submittedAt: s.submitted_at ?? s.created_at,
      photos: (images ?? []).filter((i) => i.salon_id === s.id).map((i) => ({ type: i.image_type, url: salonPhotoUrl(i.storage_path) })),
      stylistCount: (stylists ?? []).filter((t) => t.salon_id === s.id).length,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string; note?: string };
  if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ error: "Which salon?" }, { status: 400 });

  const now = new Date().toISOString();
  const changes: Record<string, Record<string, unknown>> = {
    approve: { status: "ACTIVE", is_active: true, approved_at: now, admin_note: null },
    suspend: { status: "SUSPENDED", is_active: false },
    pending: { status: "PENDING", is_active: false },
    verify: { verification_status: "VERIFIED" },
    quality: { verification_status: "QUALITY_VERIFIED" },
    unverify: { verification_status: "PENDING" },
    note: { admin_note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 1000) : null },
  };
  const change = body.action ? changes[body.action] : undefined;
  if (!change) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { error } = await getSupabaseAdmin().from("salons").update(change).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

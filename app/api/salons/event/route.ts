// /api/salons/event — counts the salon onboarding steps and profile views
// (21.10.2026), so the owner can see how many salons start, where they stop,
// and how many finish (shown on /admin/salons).
//
// Body: { event, visitor?, slug? }. Nothing personal: the visitor is the
// random id the browser already keeps for visit counting. A profile view is
// counted once per visitor per salon per hour; robots are not counted.
// (salon_onboarding_completed is recorded by the server itself when a salon
// is saved, so it can't be faked from here.)

import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { SALON_EVENTS, type SalonEvent } from "@/lib/salons";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse/i;

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua) || SUPABASE_MOCK_MODE) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const event = body.event as SalonEvent;
  if (!SALON_EVENTS.includes(event) || event === "salon_onboarding_completed") return new NextResponse(null, { status: 204 });
  const visitor = typeof body.visitor === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.visitor) ? body.visitor : null;
  if (!visitor) return new NextResponse(null, { status: 204 });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();

  let salonId: string | null = null;
  if (event === "salon_profile_viewed") {
    const slug = typeof body.slug === "string" ? body.slug : "";
    const { data: salon } = await db.from("salons").select("id").eq("slug", slug).eq("status", "ACTIVE").maybeSingle();
    if (!salon) return new NextResponse(null, { status: 204 });
    salonId = salon.id;
  }

  // Once per visitor and event (and salon) per hour.
  let q = db
    .from("salon_events")
    .select("id")
    .eq("event", event)
    .eq("visitor", visitor)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString())
    .limit(1);
  if (salonId) q = q.eq("salon_id", salonId);
  const { data: seen } = await q;
  if (seen && seen.length > 0) return new NextResponse(null, { status: 204 });

  const { error } = await db.from("salon_events").insert({ event, visitor, salon_id: salonId });
  if (error) console.error("[Tressform] salon event insert failed:", error.message);
  return new NextResponse(null, { status: 204 });
}

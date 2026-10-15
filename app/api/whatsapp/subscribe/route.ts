// /api/whatsapp/subscribe — saves a WhatsApp number with the person's
// consent (15.10.2026). See lib/whatsapp.ts. Anyone may call it (the blog
// box works without an account); a signed-in caller's number is linked to
// their account. Giving a number again renews the yes (and undoes a stop).
//
// GET  — signed in only: whether this account already gave a number, so
//        the box isn't shown twice.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { NEW_CONTACTS_PER_HOUR, WHATSAPP_CONSENT, WHATSAPP_SOURCES, cleanIndianMobile, type WhatsAppSource } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const SHAPES = ["Oval", "Round", "Square", "Heart", "Diamond", "Long"];

async function signedInId(req: NextRequest): Promise<string | null> {
  if (SUPABASE_MOCK_MODE || !req.headers.get("authorization")) return null;
  const auth = await requireUser(req);
  return auth.ok ? auth.userId : null;
}

export async function GET(req: NextRequest) {
  const userId = await signedInId(req);
  if (!userId) return NextResponse.json({ subscribed: false });
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { data } = await getSupabaseAdmin()
    .from("whatsapp_contacts")
    .select("id")
    .eq("user_id", userId)
    .is("opted_out_at", null)
    .limit(1);
  return NextResponse.json({ subscribed: (data ?? []).length > 0 });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // A hidden field people never see; robots that fill every box fill it.
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true });
  if (body.consent !== true) {
    return NextResponse.json({ error: "Please tick the box to say yes to WhatsApp messages." }, { status: 400 });
  }
  const phone = cleanIndianMobile(body.phone);
  if (!phone) return NextResponse.json({ error: "Please enter a valid 10-digit mobile number.", field: "phone" }, { status: 400 });
  const source: WhatsAppSource = (WHATSAPP_SOURCES as readonly string[]).includes(body.source as string)
    ? (body.source as WhatsAppSource)
    : "blog";
  const gender = body.gender === "men" || body.gender === "women" ? body.gender : null;
  const faceShape = typeof body.faceShape === "string" && SHAPES.includes(body.faceShape) ? body.faceShape : null;

  if (SUPABASE_MOCK_MODE) return NextResponse.json({ ok: true });

  const userId = await signedInId(req);
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();

  const { data: existing } = await db.from("whatsapp_contacts").select("id, user_id").eq("phone", phone).maybeSingle();
  if (existing) {
    const { error } = await db
      .from("whatsapp_contacts")
      .update({
        opted_in_at: new Date().toISOString(),
        opted_out_at: null,
        consent_text: WHATSAPP_CONSENT,
        ...(userId && !existing.user_id ? { user_id: userId } : {}),
        ...(gender ? { gender } : {}),
        ...(faceShape ? { face_shape: faceShape } : {}),
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: "Couldn't save your number. Please try again." }, { status: 500 });
  } else {
    const { count } = await db
      .from("whatsapp_contacts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
    if ((count ?? 0) >= NEW_CONTACTS_PER_HOUR) {
      return NextResponse.json({ error: "Please try again in a little while." }, { status: 429 });
    }
    const { error } = await db.from("whatsapp_contacts").insert({
      phone,
      user_id: userId,
      source,
      gender,
      face_shape: faceShape,
      consent_text: WHATSAPP_CONSENT,
    });
    if (error) return NextResponse.json({ error: "Couldn't save your number. Please try again." }, { status: 500 });
  }

  // Also kept on the account, if it has no number yet.
  if (userId) await db.from("profiles").update({ phone }).eq("id", userId).is("phone", null);
  return NextResponse.json({ ok: true });
}

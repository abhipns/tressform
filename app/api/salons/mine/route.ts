// /api/salons/mine — the signed-in salon owner's own salon (21.10.2026).
//
// GET  → { salon: SalonForm | null, slug, status, verification, adminNote }
//        so the onboarding page can show "edit" instead of "new", and the
//        success screen can link to the profile.
// POST → { form: SalonForm } saves the salon: creates it the first time
//        (status PENDING — it appears publicly once the owner of Tressform
//        approves it on /admin/salons), or updates it afterwards. Photos and
//        stylists are replaced with what the form now holds.
//
// FREE during the launch period: there is no payment or plan anywhere here.
// Every value is checked again on the server (lib/salons.ts, checkAll).
// One salon per account (a unique index in the database).

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { checkAll, fromSalonRow, salonSlug, toSalonRow, type SalonForm } from "@/lib/salons";
import { cleanIndianMobile } from "@/lib/whatsapp";
import { sendOwnerAlert } from "@/lib/ownerAlerts";

export const dynamic = "force-dynamic";

const OFF = { error: "Salon sign-up isn't available in the demo." };

export async function GET(req: NextRequest) {
  if (SUPABASE_MOCK_MODE) return NextResponse.json(OFF, { status: 503 });
  const auth = await requireUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  const { data: row, error } = await admin.from("salons").select("*").eq("owner_id", auth.userId).maybeSingle();
  if (error) {
    console.error("[Tressform] salon read failed:", error.message);
    return NextResponse.json({ error: "We couldn't load your salon. Please try again." }, { status: 500 });
  }
  if (!row) return NextResponse.json({ salon: null });
  const [{ data: images }, { data: stylists }] = await Promise.all([
    admin.from("salon_images").select("*").eq("salon_id", row.id).order("sort_order"),
    admin.from("salon_stylists").select("*").eq("salon_id", row.id).order("sort_order"),
  ]);
  return NextResponse.json({
    salon: fromSalonRow(row, images ?? [], stylists ?? []),
    slug: row.slug,
    status: row.status,
    verification: row.verification_status,
    adminNote: row.admin_note ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (SUPABASE_MOCK_MODE) return NextResponse.json(OFF, { status: 503 });
  let body: { form?: SalonForm };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const auth = await requireUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const form = body.form;
  if (!form || typeof form !== "object") return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

  const errors = checkAll(form, auth.userId);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: Object.values(errors)[0], errors }, { status: 400 });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  // Every photo must really be in the owner's folder (uploaded from this account).
  const { data: files, error: listError } = await admin.storage.from("salons").list(auth.userId, { limit: 1000 });
  if (listError) {
    console.error("[Tressform] salon photo list failed:", listError.message);
    return NextResponse.json({ error: "We couldn't check your photos. Please try again." }, { status: 500 });
  }
  const have = new Set((files ?? []).map((f) => `${auth.userId}/${f.name}`));
  const paths = [...form.images.map((i) => i.path), ...form.stylists.map((s) => s.photoPath).filter(Boolean)] as string[];
  if (paths.some((p) => !have.has(p))) {
    return NextResponse.json({ error: "One of the photos didn't upload properly. Please add it again." }, { status: 400 });
  }

  const values = toSalonRow(form);
  const { data: existing } = await admin.from("salons").select("id, slug, status").eq("owner_id", auth.userId).maybeSingle();

  // The same mobile number on another account's salon: most likely a second sign-up.
  const { data: sameMobile } = await admin.from("salons").select("id, owner_id").eq("mobile", values.mobile).neq("owner_id", auth.userId).limit(1);
  if (sameMobile && sameMobile.length > 0) {
    return NextResponse.json(
      {
        error:
          "A salon with this mobile number is already on Tressform. If it's yours, please sign in with the Google account you used for it, or contact us.",
        field: "mobile",
      },
      { status: 409 }
    );
  }

  let salonId: string;
  let slug: string;
  let created = false;
  if (existing) {
    const { error } = await admin.from("salons").update(values).eq("id", existing.id);
    if (error) return dbError("update", error);
    salonId = existing.id;
    slug = existing.slug;
  } else {
    slug = salonSlug(values.name, values.area, randomBytes(2).toString("hex"));
    const { data: inserted, error } = await admin
      .from("salons")
      .insert({ ...values, owner_id: auth.userId, slug, status: "PENDING", verification_status: "PENDING", subscription_plan: "FREE", is_active: false, submitted_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error || !inserted) {
      // Two submissions at the same moment: the second finds the first.
      if (error?.code === "23505") return NextResponse.json({ error: "Your salon is already saved. Please refresh the page." }, { status: 409 });
      return dbError("insert", error);
    }
    salonId = inserted.id;
    created = true;
  }

  // Photos and stylists: replace with what the form holds now.
  const { error: delImg } = await admin.from("salon_images").delete().eq("salon_id", salonId);
  if (delImg) return dbError("images delete", delImg);
  const { error: insImg } = await admin
    .from("salon_images")
    .insert(form.images.map((i, n) => ({ salon_id: salonId, storage_path: i.path, image_type: i.type, sort_order: n })));
  if (insImg) return dbError("images insert", insImg);

  const { error: delSty } = await admin.from("salon_stylists").delete().eq("salon_id", salonId);
  if (delSty) return dbError("stylists delete", delSty);
  if (form.stylists.length > 0) {
    const { error: insSty } = await admin.from("salon_stylists").insert(
      form.stylists.map((s, n) => ({
        salon_id: salonId,
        name: s.name.trim(),
        photo_path: s.photoPath || null,
        experience_years: s.experienceYears.trim() ? Number(s.experienceYears.trim()) : null,
        specialities: s.specialities,
        sort_order: n,
      }))
    );
    if (insSty) return dbError("stylists insert", insSty);
  }

  if (created) {
    // The account is now a salon account too (the owner's own ADMIN role is left alone).
    await admin.from("profiles").update({ role: "SALON" }).eq("id", auth.userId).eq("role", "CUSTOMER");
    await admin.from("salon_events").insert({ event: "salon_onboarding_completed", salon_id: salonId, user_id: auth.userId });
    await sendOwnerAlert(
      `New salon to review: ${values.name}`,
      `${values.name}, ${values.area}, ${values.city}\nOwner: ${values.owner_manager_name}, ${cleanIndianMobile(values.mobile) ?? values.mobile}\n\n` +
        `Review and approve it here: ${req.nextUrl.origin}/admin/salons`
    );
  }

  return NextResponse.json({ ok: true, slug, created, status: existing?.status ?? "PENDING" });
}

function dbError(step: string, error: { message?: string } | null) {
  console.error(`[Tressform] salon ${step} failed:`, error?.message);
  return NextResponse.json({ error: "We couldn't save your salon. Please try again." }, { status: 500 });
}

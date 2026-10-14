// Admin carousel-photo upload API — added per doc thread f3588221-19c8 ("how
// will you give me access to add the photos in the carousel? Can we add
// them through the tools we're going to use for the public?" → yes, this
// route + app/admin/carousel/page.tsx reuse the same FileReader-preview
// pattern as the public UploadFlow.tsx, just posting to an admin-only
// endpoint instead of the (not-yet-built) analysis pipeline).
//
// Auth (14.10.2026): OWNER ONLY, by login — the same check as the other
// admin routes (lib/serverAuth.ts requireAdmin: a signed-in account whose
// profile role is ADMIN). The old shared password (ADMIN_UPLOAD_KEY, sent
// as an x-admin-key header) is gone.
//
// Storage: in mock mode (no Supabase project connected — see
// lib/supabaseClient.ts) uploaded photos are kept as the data: URL the
// browser already read them as, via lib/mockStore.ts — same "no real
// persistence yet" caveat as every other mock-mode code path in this repo.
// Once a real Supabase project is connected, this uploads to the "carousel"
// storage bucket and writes rows to carousel_sessions/carousel_photos
// (db/schema.sql) instead.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mockStore } from "@/lib/mockStore";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

async function denied(req: NextRequest) {
  const auth = await requireAdmin(req, SUPABASE_MOCK_MODE ? "demo-owner" : null);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

export async function GET(req: NextRequest) {
  const no = await denied(req);
  if (no) return no;

  if (SUPABASE_MOCK_MODE) {
    return NextResponse.json({ mockMode: true, sessions: mockStore.listCarouselSessions() });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  const { data: sessions, error } = await admin
    .from("carousel_sessions")
    .select("id, caption, created_at, carousel_photos(id, src, tag, alt, sort_order)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mockMode: false, sessions });
}

/**
 * Body: multipart/form-data with:
 *   caption: string
 *   photos: one or more image files (form field repeated per file)
 *   tags: matching array of tags, one per photo (e.g. "Model" / "AI")
 */
export async function POST(req: NextRequest) {
  const no = await denied(req);
  if (no) return no;

  const form = await req.formData();
  const caption = String(form.get("caption") || "").trim();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  const tags = form.getAll("tags").map(String);

  if (!caption) return NextResponse.json({ error: "caption is required" }, { status: 400 });
  if (files.length === 0) return NextResponse.json({ error: "at least one photo is required" }, { status: 400 });
  if (files.length > 6) return NextResponse.json({ error: "6 photos max per session" }, { status: 400 });

  if (SUPABASE_MOCK_MODE) {
    const photos = await Promise.all(
      files.map(async (file, i) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const dataUrl = `data:${file.type || "image/jpeg"};base64,${buf.toString("base64")}`;
        return { id: randomUUID(), src: dataUrl, tag: tags[i] || (i === 0 ? "Model" : "AI"), alt: `${caption} — photo ${i + 1}` };
      })
    );
    const session = mockStore.addCarouselSession({
      id: randomUUID(),
      caption,
      photos,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ mockMode: true, session });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const { data: session, error: sessionError } = await admin
    .from("carousel_sessions")
    .insert({ caption })
    .select()
    .single();
  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "failed to create session" }, { status: 500 });
  }

  const photoRows = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${session.id}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("carousel")
      .upload(path, await file.arrayBuffer(), { contentType: file.type || "image/jpeg" });
    if (uploadError) {
      return NextResponse.json({ error: `upload failed for photo ${i + 1}: ${uploadError.message}` }, { status: 500 });
    }

    const { data: pub } = admin.storage.from("carousel").getPublicUrl(path);
    photoRows.push({
      session_id: session.id,
      src: pub.publicUrl,
      tag: tags[i] || (i === 0 ? "Model" : "AI"),
      alt: `${caption} — photo ${i + 1}`,
      sort_order: i,
    });
  }

  const { error: photosError } = await admin.from("carousel_photos").insert(photoRows);
  if (photosError) return NextResponse.json({ error: photosError.message }, { status: 500 });

  return NextResponse.json({ mockMode: false, session: { ...session, photos: photoRows } });
}

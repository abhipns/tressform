// /api/generate/views — the left side, right side and back of a paid preview.
//
// 12.10.2026, the owner's plan: a customer who pays for a preview sees the
// style from four sides. The front picture comes from /api/generate as
// before; the page then calls this route, which makes the other three FROM
// THAT FRONT PICTURE (lib/integrations/falai.ts, generateView) — tried by
// the owner in the Studio on a straight-haired man, a long-haired woman and
// a curly-haired man before customers got it.
//
// Rules:
//   - only for a picture the customer owns that came from a pack (order_id
//     set), or for the site owner's own tests; nothing extra is counted —
//     the four pictures are one preview;
//   - made once per picture: the first call marks the row "making", a second
//     call while it runs is told to wait, and a later call gets the pictures
//     already made;
//   - a view that fails is left out; calling again tries the missing ones.
// The three pictures' cost is added to the preview's own cost.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateView, HAIR_VIEWS, type HairView } from "@/lib/integrations/falai";
import { hairstyleById } from "@/lib/content/hairstyles";
import { mockStore } from "@/lib/mockStore";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const maxDuration = 60;

const LINK_SECONDS = 3600;
const STALE_MAKING_MS = 3 * 60 * 1000; // a "making" mark older than this was a crashed run

type Paths = Partial<Record<HairView, string>>;
type ViewRecord = { state: "making" | "done"; at: string } & Paths;

export async function POST(req: NextRequest) {
  let body: { userId?: string; photoId?: string; styleId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const style = hairstyleById(body.styleId);
  if (!style) return NextResponse.json({ error: "Unknown hairstyle." }, { status: 400 });
  const auth = await requireUser(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.userId;
  if (!body.photoId) return NextResponse.json({ error: "photoId is required." }, { status: 400 });

  // ---------------------------------------------------------------- mock DB
  if (SUPABASE_MOCK_MODE) {
    const row = [...mockStore.styleResults.values()]
      .filter((r) => r.userId === userId && r.photoId === body.photoId && r.styleName === style.name && r.status === "SUCCEEDED")
      .pop();
    if (!row?.resultImageUrl) return NextResponse.json({ error: "Make the hairstyle first." }, { status: 404 });
    if (!row.viewUrls) {
      const made = await Promise.all(
        HAIR_VIEWS.map((view) => generateView({ frontImageUrl: row.resultImageUrl!, view, styleDescription: style.prompt }))
      );
      row.viewUrls = {
        left: made[0].resultImageUrl,
        right: made[1].resultImageUrl,
        back: made[2].resultImageUrl,
      };
    }
    return NextResponse.json({ state: "done", views: row.viewUrls });
  }

  // ---------------------------------------------------------------- real DB
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const [{ data: rows }, { data: profile }] = await Promise.all([
    admin
      .from("style_results")
      .select("id, order_id, result_storage_path, view_paths, cost_paise, created_at")
      .eq("user_id", userId)
      .eq("photo_id", body.photoId)
      .eq("style_name", style.name)
      .eq("status", "SUCCEEDED")
      .not("result_storage_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(1),
    admin.from("profiles").select("role").eq("id", userId).maybeSingle(),
  ]);
  const row = rows?.[0];
  if (!row) return NextResponse.json({ error: "Make the hairstyle first." }, { status: 404 });
  if (!row.order_id && profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Side and back views come with paid hairstyles." }, { status: 402 });
  }

  const current = (row.view_paths ?? null) as ViewRecord | null;
  const missing = HAIR_VIEWS.filter((v) => !current?.[v]);

  async function links(rec: Paths) {
    const out: Record<HairView, string | null> = { left: null, right: null, back: null };
    await Promise.all(
      HAIR_VIEWS.map(async (v) => {
        const path = rec[v];
        if (!path) return;
        if (path.startsWith("http")) return void (out[v] = path);
        const { data } = await admin.storage.from("results").createSignedUrl(path, LINK_SECONDS);
        out[v] = data?.signedUrl ?? null;
      })
    );
    return out;
  }

  if (missing.length === 0) return NextResponse.json({ state: "done", views: await links(current!) });
  if (current?.state === "making" && Date.now() - new Date(current.at).getTime() < STALE_MAKING_MS) {
    return NextResponse.json({ state: "making", views: await links(current) });
  }

  // Claim the row, so two calls never pay for the same pictures twice.
  const claim: ViewRecord = { ...(current ?? {}), state: "making", at: new Date().toISOString() };
  let claimQuery = admin.from("style_results").update({ view_paths: claim }).eq("id", row.id);
  // Only if nobody changed it since we read it ("at" changes on every write).
  claimQuery = current ? claimQuery.eq("view_paths->>at", current.at) : claimQuery.is("view_paths", null);
  const { data: claimed } = await claimQuery.select("id");
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ state: "making", views: { left: null, right: null, back: null } });
  }

  const front = row.result_storage_path as string;
  let frontUrl = front;
  if (!front.startsWith("http")) {
    const { data } = await admin.storage.from("results").createSignedUrl(front, 600);
    if (!data?.signedUrl) {
      await admin.from("style_results").update({ view_paths: current }).eq("id", row.id);
      return NextResponse.json({ error: "We couldn't open your hairstyle — please try again." }, { status: 502 });
    }
    frontUrl = data.signedUrl;
  }

  let spent = 0;
  const made: Paths = {};
  await Promise.all(
    missing.map(async (view) => {
      const r = await generateView({ frontImageUrl: frontUrl, view, styleDescription: style.prompt });
      if (r.status !== "SUCCEEDED" || !r.resultImageUrl) return;
      spent += r.mock ? 0 : r.costPaise;
      if (r.mock) return void (made[view] = r.resultImageUrl);
      try {
        const download = await fetch(r.resultImageUrl);
        if (!download.ok) throw new Error(`download ${download.status}`);
        const bytes = new Uint8Array(await download.arrayBuffer());
        const path = `${userId}/${randomUUID()}-${view}.jpg`;
        const { error } = await admin.storage.from("results").upload(path, bytes, { contentType: "image/jpeg" });
        if (error) throw new Error(error.message);
        made[view] = path;
      } catch (err) {
        console.error(`[Tressform] ${view} view could not be saved:`, (err as Error).message);
      }
    })
  );

  const finished: ViewRecord = { ...(current ?? {}), ...made, state: "done", at: new Date().toISOString() };
  await admin
    .from("style_results")
    .update({ view_paths: finished, cost_paise: (row.cost_paise ?? 0) + spent })
    .eq("id", row.id);

  const stillMissing = HAIR_VIEWS.filter((v) => !finished[v]);
  return NextResponse.json({
    state: "done",
    views: await links(finished),
    ...(stillMissing.length ? { error: "Some views couldn't be made — tap “Try again” to make them." } : {}),
  });
}

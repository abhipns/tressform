// /api/admin/world — making the "Hairstyles of the World" gallery pictures
// (26.10.2026). OWNER ONLY. Used by "World hairstyles – make pictures" in
// /admin/studio; see lib/worldPictures.ts.
//
// GET   which pictures are made and what they have cost so far.
// POST  { action: "make", kind: "model", key: "<region>-<gender>" }
//         makes a region's plain "before" model photo (and keeps the
//         full-size copy, which every style of that region is made from);
//       { action: "make", kind: "style", key: "<slug>" }
//         makes a style's front picture on its region's model;
//       both answer with the picture, for the owner's browser to make the
//       small WebP with the mark;
//       { action: "save", kind, key, webp: "data:image/webp;base64,…" }
//         stores that small copy for the gallery.
// Every picture costs real money on fal.ai (about ₹3.50 each); it is added
// to the running total.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { mockStore } from "@/lib/mockStore";
import { FALAI_COST_PER_IMAGE_PAISE, generateHairstyle, generatePortrait } from "@/lib/integrations/falai";
import { REGION_LABEL, WORLD_REGIONS, WORLD_STYLES, modelPrompt, worldStyleBySlug, type WorldRegion } from "@/lib/content/worldHairstyles";
import { WORLD_BUCKET, worldPictureRows, worldPublicUrl, type WorldPictureKind, type WorldPictureRow } from "@/lib/worldPictures";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SMALL_BYTES = 600_000;

function modelKey(region: WorldRegion, gender: "men" | "women") {
  return `${region}-${gender}`;
}

function parseModelKey(key: string): { region: WorldRegion; gender: "men" | "women" } | null {
  const m = /^([a-z-]+)-(men|women)$/.exec(key);
  if (!m || !(WORLD_REGIONS as readonly string[]).includes(m[1])) return null;
  return { region: m[1] as WorldRegion, gender: m[2] as "men" | "women" };
}

async function guard(req: NextRequest) {
  const auth = await requireAdmin(req, SUPABASE_MOCK_MODE ? "demo-owner" : null);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

/** A plain picture for the demo (no fal.ai), drawn as SVG so the browser can shrink and mark it. */
function demoPicture(label: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="960" viewBox="0 0 768 960">` +
    `<rect width="768" height="960" fill="#E7ECE8"/><circle cx="384" cy="380" r="150" fill="#C9D3CC"/>` +
    `<rect x="214" y="560" width="340" height="300" rx="150" fill="#C9D3CC"/>` +
    `<text x="384" y="910" font-family="sans-serif" font-size="30" text-anchor="middle" fill="#16261C">${label.replace(/[<&>]/g, "")}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function saveRow(row: WorldPictureRow) {
  if (SUPABASE_MOCK_MODE) {
    mockStore.worldPictures.set(`${row.kind}:${row.key}`, row);
    return;
  }
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { error } = await getSupabaseAdmin()
    .from("world_pictures")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "kind,key" });
  if (error) throw new Error(`world_pictures: ${error.message}`);
}

export async function GET(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const rows = await worldPictureRows();
  const made = new Map(rows.map((r) => [`${r.kind}:${r.key}`, r]));
  const models = WORLD_REGIONS.flatMap((region) =>
    (["men", "women"] as const).map((gender) => ({
      key: modelKey(region, gender),
      label: `${REGION_LABEL[region]}, ${gender}`,
      made: Boolean(made.get(`model:${modelKey(region, gender)}`)?.small_path),
      hasFull: Boolean(made.get(`model:${modelKey(region, gender)}`)?.full_path),
    }))
  );
  const styles = WORLD_STYLES.map((s) => ({
    key: s.slug,
    label: s.name,
    model: modelKey(s.region, s.gender),
    made: Boolean(made.get(`style:${s.slug}`)?.small_path),
  }));
  return NextResponse.json({
    models,
    styles,
    spentPaise: rows.reduce((sum, r) => sum + (r.cost_paise ?? 0), 0),
    perPicturePaise: FALAI_COST_PER_IMAGE_PAISE,
  });
}

export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; kind?: unknown; key?: unknown; webp?: unknown };
  const kind: WorldPictureKind | null = body.kind === "model" || body.kind === "style" ? body.kind : null;
  const key = typeof body.key === "string" ? body.key.slice(0, 80) : "";
  if (!kind || !key) return NextResponse.json({ error: "Which picture?" }, { status: 400 });
  const model = kind === "model" ? parseModelKey(key) : null;
  const style = kind === "style" ? worldStyleBySlug(key) : null;
  if ((kind === "model" && !model) || (kind === "style" && !style)) {
    return NextResponse.json({ error: "That picture isn't on the list." }, { status: 400 });
  }
  const rows = await worldPictureRows();
  const existing = rows.find((r) => r.kind === kind && r.key === key) ?? null;

  // ------------------------------------------------------------------ save
  if (body.action === "save") {
    const webp = typeof body.webp === "string" ? body.webp : "";
    const m = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(webp);
    if (!m) return NextResponse.json({ error: "The small picture didn't come through." }, { status: 400 });
    const bytes = Buffer.from(m[1], "base64");
    if (bytes.length > MAX_SMALL_BYTES) return NextResponse.json({ error: "The small picture is too big." }, { status: 400 });
    let smallPath = webp;
    if (!SUPABASE_MOCK_MODE) {
      const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
      smallPath = `small/${kind}-${key}.webp`;
      const { error } = await getSupabaseAdmin()
        .storage.from(WORLD_BUCKET)
        .upload(smallPath, bytes, { contentType: "image/webp", upsert: true, cacheControl: "604800" });
      if (error) return NextResponse.json({ error: `Couldn't store it: ${error.message}` }, { status: 500 });
    }
    await saveRow({ kind, key, full_path: existing?.full_path ?? null, small_path: smallPath, cost_paise: existing?.cost_paise ?? 0 });
    return NextResponse.json({ ok: true, url: smallPath.startsWith("data:") ? smallPath : worldPublicUrl(smallPath) });
  }

  if (body.action !== "make") return NextResponse.json({ error: "Make or save?" }, { status: 400 });

  // ------------------------------------------------------------------ make
  let result;
  if (model) {
    result = await generatePortrait(modelPrompt(model.region, model.gender));
  } else {
    const modelRow = rows.find((r) => r.kind === "model" && r.key === modelKey(style!.region, style!.gender));
    if (!modelRow?.full_path) {
      return NextResponse.json({ error: `Make the ${REGION_LABEL[style!.region]} ${style!.gender}'s model photo first.`, needsModel: true }, { status: 409 });
    }
    const source = modelRow.full_path.startsWith("data:") || modelRow.full_path.startsWith("http") ? modelRow.full_path : worldPublicUrl(modelRow.full_path);
    result = await generateHairstyle({
      sourceImageUrl: source,
      styleName: style!.name,
      styleDescription: style!.cut,
      gender: style!.gender,
      greyBackground: true,
      evenLight: true,
    });
  }
  if (result.status !== "SUCCEEDED" || !result.resultImageUrl) {
    return NextResponse.json({ error: result.errorMessage ?? "The picture couldn't be made. Please try again." }, { status: 502 });
  }

  let dataUrl: string;
  let fullPath: string | null = existing?.full_path ?? null;
  if (result.mock) {
    dataUrl = demoPicture(model ? `${REGION_LABEL[model.region]} model (${model.gender})` : style!.name);
    if (model) fullPath = dataUrl;
  } else {
    const download = await fetch(result.resultImageUrl);
    if (!download.ok) return NextResponse.json({ error: "The picture was made but couldn't be fetched. Please try again." }, { status: 502 });
    const bytes = Buffer.from(await download.arrayBuffer());
    const type = download.headers.get("content-type") ?? result.contentType ?? "image/jpeg";
    dataUrl = `data:${type};base64,${bytes.toString("base64")}`;
    if (model && !SUPABASE_MOCK_MODE) {
      // The full-size model photo: every style of this region and gender is made from it.
      const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
      fullPath = `full/model-${key}.jpg`;
      const { error } = await getSupabaseAdmin().storage.from(WORLD_BUCKET).upload(fullPath, bytes, { contentType: type, upsert: true });
      if (error) return NextResponse.json({ error: `Couldn't store the model photo: ${error.message}` }, { status: 500 });
    } else if (model) {
      fullPath = dataUrl;
    }
  }
  const costPaise = result.mock ? 0 : result.costPaise;
  await saveRow({ kind, key, full_path: fullPath, small_path: existing?.small_path ?? null, cost_paise: (existing?.cost_paise ?? 0) + costPaise });
  return NextResponse.json({ dataUrl, costPaise });
}

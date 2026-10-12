// /api/admin/studio/views — side and back views of one Studio picture.
//
// 12.10.2026, the first step of the owner's four-view plan: before any
// customer gets left, right and back pictures, the owner makes them here
// from Studio front pictures and judges them. OWNER ONLY (requireAdmin).
//
// The three views are made at the same time from the FRONT picture (the
// one with the new haircut), each saved to private storage and recorded in
// style_results with its cost, like every other Studio picture. One view
// failing doesn't lose the others.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { HAIR_VIEWS, generateView, FALAI_MODELS, type FalaiModel, type HairView } from "@/lib/integrations/falai";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const maxDuration = 60;

const LINK_SECONDS = 6 * 3600;

interface ViewsBody {
  userId?: string; // mock mode only
  frontImageUrl?: string; // mock mode only
  resultPath?: string; // real mode: the Studio front picture, from /api/admin/studio
  photoId?: string;
  styleLabel?: string;
  styleText?: string; // the full description, back included
  model?: string;
  views?: HairView[];
}

export async function POST(req: NextRequest) {
  let body: ViewsBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const auth = await requireAdmin(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.userId;

  const styleText = (body.styleText ?? "").trim();
  const styleLabel = (body.styleLabel ?? "").trim().slice(0, 80) || "hairstyle";
  if (styleText.length < 4 || styleText.length > 800) {
    return NextResponse.json({ error: "Describe the hairstyle first." }, { status: 400 });
  }
  const model: FalaiModel | null = body.model && body.model in FALAI_MODELS ? (body.model as FalaiModel) : null;
  const views = (body.views ?? HAIR_VIEWS).filter((v): v is HairView => HAIR_VIEWS.includes(v));
  const started = Date.now();

  if (SUPABASE_MOCK_MODE) {
    if (!body.frontImageUrl) return NextResponse.json({ error: "Make the front picture first." }, { status: 400 });
    const made = await Promise.all(views.map((view) => generateView({ frontImageUrl: body.frontImageUrl!, view, styleDescription: styleText, model })));
    return NextResponse.json({
      views: made.map((r, i) => ({ view: views[i], url: r.resultImageUrl, error: r.status === "SUCCEEDED" ? null : r.errorMessage, costPaise: 0 })),
      seconds: Math.round((Date.now() - started) / 100) / 10,
    });
  }

  const resultPath = (body.resultPath ?? "").trim();
  if (!resultPath.startsWith(`${userId}/studio/`) || resultPath.includes("..")) {
    return NextResponse.json({ error: "Make the front picture first." }, { status: 400 });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  // Costs are filed against the photo the front picture was made from (style_results needs one).
  const { data: photo } = await admin.from("photos").select("id").eq("id", body.photoId ?? "").eq("user_id", userId).maybeSingle();
  if (!photo) return NextResponse.json({ error: "We couldn't find that photo — please upload it again." }, { status: 404 });
  const { data: front, error: frontError } = await admin.storage.from("results").createSignedUrl(resultPath, 600);
  if (frontError || !front?.signedUrl) {
    return NextResponse.json({ error: "We couldn't open the front picture — please make it again." }, { status: 404 });
  }

  const made = await Promise.all(
    views.map(async (view) => {
      const r = await generateView({ frontImageUrl: front.signedUrl, view, styleDescription: styleText, model });
      if (r.status !== "SUCCEEDED" || !r.resultImageUrl) return { view, url: null, error: r.errorMessage ?? "Failed.", costPaise: 0 };
      try {
        const download = await fetch(r.resultImageUrl);
        if (!download.ok) throw new Error(`download ${download.status}`);
        const bytes = new Uint8Array(await download.arrayBuffer());
        const path = `${userId}/studio/${randomUUID()}-${view}.jpg`;
        const { error: uploadError } = await admin.storage.from("results").upload(path, bytes, { contentType: "image/jpeg" });
        if (uploadError) throw new Error(uploadError.message);
        const { data: link } = await admin.storage.from("results").createSignedUrl(path, LINK_SECONDS);
        await admin.from("style_results").insert({
          user_id: userId,
          photo_id: photo.id,
          style_name: `Studio ${view} view: ${styleLabel}`.slice(0, 120),
          status: "SUCCEEDED",
          result_storage_path: path,
          provider: r.model,
          cost_paise: r.costPaise,
          completed_at: new Date().toISOString(),
        });
        return { view, url: link?.signedUrl ?? null, error: link?.signedUrl ? null : "Saved, but no link.", costPaise: r.costPaise };
      } catch (err) {
        console.error(`[Tressform] Studio ${view} view: could not store:`, (err as Error).message);
        return { view, url: null, error: "Made, but couldn't be saved — try again.", costPaise: r.costPaise };
      }
    })
  );

  return NextResponse.json({ views: made, seconds: Math.round((Date.now() - started) / 100) / 10 });
}

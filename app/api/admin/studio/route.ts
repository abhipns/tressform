// /api/admin/studio — makes one hairstyle image for the site owner.
//
// 10.10.2026. The owner asked for a way to create example images for the
// home page carousel from his own model photos, and to judge the image
// model while doing it. This is the server half of /admin/studio.
//
// How it differs from /api/generate (the customer route):
//   - OWNER ONLY. The caller must be signed in AND have role ADMIN in the
//     database (requireAdmin). Anyone else gets "owner only".
//   - no free-preview allowance is involved — nothing is counted, reserved
//     or handed back;
//   - the hairstyle is whatever text the owner sends, not a fixed list;
//   - the owner can pick which of the supported image models to use for
//     that one image, to compare them.
// Everything else is the same proven path: the photo must be one the caller
// uploaded and had analysed, the image model is given a short-lived private
// link to it, and the result is copied into private storage before a link
// is returned. Each image is recorded in style_results with its real cost,
// so Studio spending shows up in the same place as everything else.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateHairstyle, FALAI_MODELS, type FalaiModel } from "@/lib/integrations/falai";
import { checkPreview, describeVerdict, poseFromAnalysis, type PreviewVerdict } from "@/lib/previewCheck";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const maxDuration = 60;

const SOURCE_LINK_SECONDS = 600;
const RESULT_LINK_SECONDS = 6 * 3600; // long enough for a working session of downloading

interface StudioBody {
  userId?: string; // mock mode only
  photoId?: string;
  sourceImageUrl?: string; // mock mode only
  styleLabel?: string;
  styleText?: string;
  gender?: "men" | "women";
  model?: string;
  polish?: boolean; // false = change the hair only, no "flattering photo" finish
}

function extensionFor(contentType: string | null): { ext: string; type: string } {
  if (contentType?.includes("png")) return { ext: "png", type: "image/png" };
  if (contentType?.includes("webp")) return { ext: "webp", type: "image/webp" };
  return { ext: "jpg", type: "image/jpeg" };
}

export async function POST(req: NextRequest) {
  let body: StudioBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const auth = await requireAdmin(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.userId;

  const styleText = (body.styleText ?? "").trim();
  const styleLabel = (body.styleLabel ?? "").trim().slice(0, 80) || styleText.slice(0, 80);
  if (styleText.length < 4) {
    return NextResponse.json({ error: "Describe the hairstyle first." }, { status: 400 });
  }
  if (styleText.length > 600) {
    return NextResponse.json({ error: "That description is too long — keep it under 600 characters." }, { status: 400 });
  }
  const model: FalaiModel | null = body.model && body.model in FALAI_MODELS ? (body.model as FalaiModel) : null;
  const started = Date.now();

  // ---------------------------------------------------------------- mock DB
  if (SUPABASE_MOCK_MODE) {
    if (!body.sourceImageUrl) return NextResponse.json({ error: "Upload a photo first." }, { status: 400 });
    const result = await generateHairstyle({
      sourceImageUrl: body.sourceImageUrl,
      styleName: styleLabel,
      styleDescription: styleText,
      model,
      polish: body.polish !== false,
    });
    if (result.status !== "SUCCEEDED" || !result.resultImageUrl) {
      return NextResponse.json({ error: result.errorMessage || "Generation failed." }, { status: 502 });
    }
    return NextResponse.json({
      mockMode: true,
      resultImageUrl: result.resultImageUrl,
      model: result.model,
      seconds: Math.round((Date.now() - started) / 100) / 10,
      costPaise: 0,
    });
  }

  // ---------------------------------------------------------------- real DB
  if (!body.photoId) return NextResponse.json({ error: "Upload a photo first." }, { status: 400 });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const { data: photo, error: photoError } = await admin
    .from("photos")
    .select("id, storage_path, face_shape, rekognition_raw")
    .eq("id", body.photoId)
    .eq("user_id", userId)
    .maybeSingle();
  if (photoError || !photo) {
    return NextResponse.json({ error: "We couldn't find that photo — please upload it again." }, { status: 404 });
  }

  // For a man, the image model is told what the analysis saw (clean-shaven
  // or bearded) so it doesn't invent or remove a beard. For a woman that
  // sentence would only be noise, so it gets the neutral "leave facial hair
  // alone" line.
  const analysed = (
    photo.rekognition_raw as { tressform?: { facialHair?: unknown; imageSize?: { width?: number; height?: number } | null } } | null
  )?.tressform;
  const imageSize =
    typeof analysed?.imageSize?.width === "number" && typeof analysed?.imageSize?.height === "number"
      ? { width: analysed.imageSize.width, height: analysed.imageSize.height }
      : null;
  const facialHair =
    body.gender !== "women" &&
    (analysed?.facialHair === "beard" || analysed?.facialHair === "moustache" || analysed?.facialHair === "clean")
      ? analysed.facialHair
      : null;

  const { data: signed, error: signError } = await admin.storage
    .from("photos")
    .createSignedUrl(photo.storage_path, SOURCE_LINK_SECONDS);
  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "We couldn't open that photo — please upload it again." }, { status: 404 });
  }

  const result = await generateHairstyle({
    sourceImageUrl: signed.signedUrl,
    styleName: styleLabel,
    styleDescription: styleText,
    faceShape: photo.face_shape ?? null,
    facialHair,
    model,
    polish: body.polish !== false,
    imageSize,
  });
  if (result.status !== "SUCCEEDED" || !result.resultImageUrl) {
    return NextResponse.json({ error: result.errorMessage || "Generation failed." }, { status: 502 });
  }

  let storedPath = result.resultImageUrl;
  let link = result.resultImageUrl;
  // 11.10.2026: the same check customers' previews get (lib/previewCheck.ts)
  // — is it the same person, has the head turned? Here the picture is
  // never thrown away or remade: the owner is shown it together with the
  // numbers, which is how the check's limits get set from real pictures.
  let verdict: PreviewVerdict | null = null;
  if (!result.mock) {
    try {
      const download = await fetch(result.resultImageUrl);
      if (!download.ok) throw new Error(`download ${download.status}`);
      const { ext, type } = extensionFor(result.contentType ?? download.headers.get("content-type"));
      const bytes = new Uint8Array(await download.arrayBuffer());
      const path = `${userId}/studio/${randomUUID()}.${ext}`;

      const { data: originalFile } = await admin.storage.from("photos").download(photo.storage_path);
      const originalBytes = originalFile ? new Uint8Array(await originalFile.arrayBuffer()) : null;
      verdict = await checkPreview(originalBytes, bytes, poseFromAnalysis(photo.rekognition_raw));

      const { error: uploadError } = await admin.storage.from("results").upload(path, bytes, { contentType: type });
      if (uploadError) throw new Error(`upload ${uploadError.message}`);

      const { data: resultLink, error: linkError } = await admin.storage
        .from("results")
        .createSignedUrl(path, RESULT_LINK_SECONDS);
      if (linkError || !resultLink?.signedUrl) throw new Error(`link ${linkError?.message}`);

      storedPath = path;
      link = resultLink.signedUrl;
    } catch (err) {
      console.error("[Tressform] Studio: could not store generated image:", (err as Error).message);
      return NextResponse.json({ error: "The image was made but couldn't be saved — please try again." }, { status: 502 });
    }
  }

  const { error: insertError } = await admin.from("style_results").insert({
    user_id: userId,
    photo_id: photo.id,
    style_name: `Studio: ${styleLabel}${body.polish === false ? " (hair only)" : ""}`.slice(0, 120),
    status: "SUCCEEDED",
    result_storage_path: storedPath,
    provider: result.mock ? "mock" : result.model,
    cost_paise: result.mock ? 0 : result.costPaise,
    check_result: verdict ? { ...verdict, attempts: 1 } : null,
    completed_at: new Date().toISOString(),
  });
  if (insertError) console.error("[Tressform] Studio: style_results insert failed:", insertError.message);

  return NextResponse.json({
    mockMode: false,
    samplePreview: result.mock,
    resultImageUrl: link,
    model: result.model,
    seconds: Math.round((Date.now() - started) / 100) / 10,
    costPaise: result.mock ? 0 : result.costPaise,
    check: verdict ? { ok: verdict.ok, checked: verdict.checked, summary: describeVerdict(verdict) } : null,
  });
}

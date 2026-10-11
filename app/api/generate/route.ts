// /api/generate — top-priority gap fix, paired with /api/analyze (see that
// route's header comment for context). Also closes a second gap from the
// doc's list: "free_previews_used is never read or incremented anywhere —
// zero enforcement of the 2-free-previews cap." This route is the one and
// only place that should ever change it.
//
// Flow: FAL AI generates the styled image (lib/integrations/falai.ts,
// mock-mode aware on FAL_AI_API_KEY). There is no paid-credit path yet, so
// a generation past the free allowance is refused; once orders/credits are
// wired up, the check becomes "has a free preview left OR an unconsumed
// paid credit".
//
// 09.10.2026 (real sign-in): in real mode the caller is identified from
// their login token, and the source image is looked up from THEIR OWN
// photos row (by photoId) rather than accepted from the request body — so
// nobody can generate against someone else's photo.
//
// 09.10.2026 (real previews): with a real FAL key —
//   - a free preview is RESERVED before generating (one atomic database
//     step, so two requests at the same moment can't both slip under the
//     cap and cost twice) and given back if the generation fails;
//   - the finished image is copied from FAL's storage into Tressform's
//     private "results" storage, under the customer's own folder, and the
//     page is sent a short-lived private link to that copy;
//   - while FAL is still in mock mode, real accounts get placeholder images
//     that do NOT use up a free preview (samplePreview: true).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateHairstyle, FALAI_MOCK_MODE } from "@/lib/integrations/falai";
import { mockStore } from "@/lib/mockStore";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

// A real generation takes roughly 10–30 seconds; give the function room.
export const maxDuration = 60;

const SOURCE_LINK_SECONDS = 600; // long enough for FAL to fetch the photo
const RESULT_LINK_SECONDS = 3600; // how long the customer's preview link works

interface GenerateBody {
  userId?: string; // mock mode only — ignored when a real project is connected
  photoId?: string;
  sourceImageUrl?: string; // mock mode only — real mode reads it from the photos row
  styleName?: string;
  faceShape?: string | null;
  /** Whose hairstyle it is: decides which image model makes the preview. */
  gender?: string | null;
}

function extensionFor(contentType: string | null): { ext: string; type: string } {
  if (contentType?.includes("png")) return { ext: "png", type: "image/png" };
  if (contentType?.includes("webp")) return { ext: "webp", type: "image/webp" };
  return { ext: "jpg", type: "image/jpeg" };
}

export async function POST(req: NextRequest) {
  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { photoId, sourceImageUrl, styleName, faceShape } = body;
  const gender = body.gender === "men" || body.gender === "women" ? body.gender : null;

  const auth = await requireUser(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.userId;

  if (SUPABASE_MOCK_MODE && !sourceImageUrl) {
    return NextResponse.json({ error: "sourceImageUrl is required." }, { status: 400 });
  }
  if (!SUPABASE_MOCK_MODE && !photoId) {
    return NextResponse.json({ error: "photoId is required — analyze a photo first." }, { status: 400 });
  }
  if (!styleName) return NextResponse.json({ error: "styleName is required." }, { status: 400 });

  // ---------------------------------------------------------------- mock DB
  if (SUPABASE_MOCK_MODE) {
    const profile = mockStore.getOrCreateProfile(userId);
    if (profile.freePreviewsUsed >= profile.freePreviewsLimit) {
      return NextResponse.json(
        {
          error: `You've used your ${profile.freePreviewsLimit} free previews — purchase a pack to keep generating.`,
          freePreviewsUsed: profile.freePreviewsUsed,
          freePreviewsLimit: profile.freePreviewsLimit,
        },
        { status: 402 }
      );
    }

    const result = await generateHairstyle({ sourceImageUrl: sourceImageUrl!, styleName, faceShape, gender });

    if (result.status !== "SUCCEEDED" || !result.resultImageUrl) {
      return NextResponse.json({ error: result.errorMessage || "Generation failed." }, { status: 502 });
    }

    // Only spend the allowance on a successful generation.
    profile.freePreviewsUsed += 1;

    mockStore.addStyleResult({
      id: randomUUID(),
      userId,
      photoId: photoId || "unknown",
      styleName,
      status: "SUCCEEDED",
      resultImageUrl: result.resultImageUrl,
      provider: "fal_ai_pulid_flux",
      costPaise: result.costPaise,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      mockMode: true,
      resultImageUrl: result.resultImageUrl,
      freePreviewsUsed: profile.freePreviewsUsed,
      freePreviewsLimit: profile.freePreviewsLimit,
    });
  }

  // ---------------------------------------------------------------- real DB
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  // The photo must be one of the caller's own. Its row and the caller's
  // profile are fetched together (09.10.2026: the server and database sit
  // far apart, and doing these one after another was most of the wait).
  const [{ data: photo, error: photoError }, { data: profile, error: profileError }] = await Promise.all([
    admin
      .from("photos")
      .select("id, storage_path, face_shape, rekognition_raw")
      .eq("id", photoId)
      .eq("user_id", userId)
      .maybeSingle(),
    admin.from("profiles").select("id, free_previews_used, free_previews_limit").eq("id", userId).maybeSingle(),
  ]);
  if (photoError || !photo) {
    return NextResponse.json({ error: "We couldn't find that photo — please upload it again." }, { status: 404 });
  }

  // What the analysis recorded about this photo — trusted over anything
  // the browser sends.
  const analysed = (photo.rekognition_raw as { tressform?: { facialHair?: unknown } } | null)?.tressform;
  const facialHair =
    analysed?.facialHair === "beard" || analysed?.facialHair === "moustache" || analysed?.facialHair === "clean"
      ? analysed.facialHair
      : null;
  const analysedFaceShape: string | null = photo.face_shape ?? faceShape ?? null;

  const { data: signed, error: signError } = await admin.storage
    .from("photos")
    .createSignedUrl(photo.storage_path, SOURCE_LINK_SECONDS);
  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "We couldn't open that photo — please upload it again." }, { status: 404 });
  }

  if (profileError || !profile) {
    console.error("[Tressform] No profile row for signed-in user", userId, profileError?.message);
    return NextResponse.json(
      { error: "We couldn't load your account. Please log out, log in again, and retry." },
      { status: 404 }
    );
  }

  const limitReached = () =>
    NextResponse.json(
      {
        error: `You've used your ${profile.free_previews_limit} free previews — purchase a pack to keep generating.`,
        freePreviewsUsed: profile.free_previews_limit,
        freePreviewsLimit: profile.free_previews_limit,
      },
      { status: 402 }
    );

  // Real generations cost money, so the allowance is taken up front in one
  // atomic step and handed back if anything below fails. Placeholder
  // generations (FAL still in mock mode) are free and never counted.
  let reserved = false;
  if (FALAI_MOCK_MODE) {
    if (profile.free_previews_used >= profile.free_previews_limit) return limitReached();
  } else {
    const { data: ok, error: reserveError } = await admin.rpc("reserve_free_preview", { profile_id: userId });
    if (reserveError) {
      console.error("[Tressform] reserve_free_preview failed:", reserveError.message);
      return NextResponse.json({ error: "We couldn't start your preview — please try again." }, { status: 500 });
    }
    if (!ok) return limitReached();
    reserved = true;
  }

  async function giveBack() {
    if (!reserved) return;
    reserved = false;
    const { error } = await admin.rpc("release_free_preview", { profile_id: userId });
    if (error) console.error("[Tressform] release_free_preview failed for", userId, error.message);
  }

  let result;
  try {
    result = await generateHairstyle({
      sourceImageUrl: signed.signedUrl,
      styleName,
      faceShape: analysedFaceShape,
      facialHair,
      gender,
    });
  } catch (err) {
    await giveBack();
    return NextResponse.json({ error: err instanceof Error ? err.message : "Generation failed." }, { status: 502 });
  }

  if (result.status !== "SUCCEEDED" || !result.resultImageUrl) {
    await giveBack();
    return NextResponse.json({ error: result.errorMessage || "Generation failed." }, { status: 502 });
  }

  // Placeholder image: record it and return the placeholder link as-is.
  // Real image: copy it into the customer's private results folder first.
  let storedPath = result.resultImageUrl;
  let linkForCustomer = result.resultImageUrl;

  if (!result.mock) {
    try {
      const download = await fetch(result.resultImageUrl);
      if (!download.ok) throw new Error(`download ${download.status}`);
      const { ext, type } = extensionFor(result.contentType ?? download.headers.get("content-type"));
      const bytes = new Uint8Array(await download.arrayBuffer());
      const path = `${userId}/${randomUUID()}.${ext}`;

      const { error: uploadError } = await admin.storage.from("results").upload(path, bytes, { contentType: type });
      if (uploadError) throw new Error(`upload ${uploadError.message}`);

      const { data: resultLink, error: linkError } = await admin.storage
        .from("results")
        .createSignedUrl(path, RESULT_LINK_SECONDS);
      if (linkError || !resultLink?.signedUrl) throw new Error(`link ${linkError?.message}`);

      storedPath = path;
      linkForCustomer = resultLink.signedUrl;
    } catch (err) {
      console.error("[Tressform] Could not store generated preview:", (err as Error).message);
      await giveBack();
      return NextResponse.json({ error: "We couldn't save your preview — please try again." }, { status: 502 });
    }
  }

  const { error: insertError } = await admin.from("style_results").insert({
    user_id: userId,
    photo_id: photo.id,
    style_name: styleName,
    status: "SUCCEEDED",
    result_storage_path: storedPath,
    provider: result.mock ? "mock" : result.model,
    cost_paise: result.mock ? 0 : result.costPaise,
    completed_at: new Date().toISOString(),
  });
  if (insertError) {
    // The customer still gets the image they were just charged an allowance
    // for; the missing record is ours to chase.
    console.error("[Tressform] style_results insert failed:", insertError.message);
  }

  const used = result.mock ? profile.free_previews_used : Math.min(profile.free_previews_used + 1, profile.free_previews_limit);

  return NextResponse.json({
    mockMode: false,
    samplePreview: result.mock,
    resultImageUrl: linkForCustomer,
    freePreviewsUsed: used,
    freePreviewsLimit: profile.free_previews_limit,
  });
}

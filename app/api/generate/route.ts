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
//
// 11.10.2026 (the customer's own picks): the page now names a style from
// the list of 60 by its id (`styleId`), and the description the image model
// is given is looked up HERE from lib/content/hairstyles.ts. A browser can
// name a style; it can never supply the wording. The page also sends what
// the customer confirmed about themselves (face shape, hair length, hair
// type), which is saved with the photo so the reading can be compared with
// what customers correct it to. And asking twice for the same style on the
// same photo gives back the picture already made, without counting again.
//
// 11.10.2026 (paid previews): a preview now comes from the customer's free
// allowance first and then from a pack they bought (lib/allowance.ts). A
// preview made from a pack is recorded against that order, which is also
// what keeps a paid picture out of the 90-day clean-up. The reply says how
// many previews are left in all (`previewsLeft`).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateHairstyle, FALAI_MOCK_MODE, type GenerateHairstyleResult } from "@/lib/integrations/falai";
import { checkPreview, describeVerdict, poseFromAnalysis, type PreviewVerdict } from "@/lib/previewCheck";
import { frontDescription, hairstyleById, MEN_LENGTHS, WOMEN_LENGTHS } from "@/lib/content/hairstyles";
import { mockStore } from "@/lib/mockStore";
import {
  mockPreviewsLeft,
  mockReleasePreview,
  mockReservePreview,
  previewsLeft as countPreviewsLeft,
  releasePreview,
  reservePreview,
  type Reservation,
} from "@/lib/allowance";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

// A real generation takes roughly 10–30 seconds; give the function room.
export const maxDuration = 60;

const SOURCE_LINK_SECONDS = 600; // long enough for FAL to fetch the photo
const RESULT_LINK_SECONDS = 3600; // how long the customer's preview link works
// 11.10.2026 — the safety net. Every preview is compared with the customer's
// photo before they see it (lib/previewCheck.ts). One that shows a different
// person or a turned head is thrown away and made again, this many times in
// all; if none passes, the customer is told and the preview is not counted.
const MAX_ATTEMPTS = 2;

interface GenerateBody {
  userId?: string; // mock mode only — ignored when a real project is connected
  photoId?: string;
  sourceImageUrl?: string; // mock mode only — real mode reads it from the photos row
  /** A style from the list of 60 (lib/content/hairstyles.ts). */
  styleId?: string;
  /** Older pages only: one of the three original styles, by name. */
  styleName?: string;
  faceShape?: string | null;
  /** What the customer confirmed on the result screen. */
  details?: { faceShape?: unknown; length?: unknown; texture?: unknown } | null;
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

  const { photoId, sourceImageUrl } = body;
  const style = hairstyleById(body.styleId);
  if (body.styleId && !style) {
    return NextResponse.json({ error: "That hairstyle isn't on our list. Please refresh the page and try again." }, { status: 400 });
  }
  const styleName = style?.name ?? body.styleName;
  const styleDescription = style ? frontDescription(style) : null;
  const gender = style?.gender ?? (body.gender === "men" || body.gender === "women" ? body.gender : null);

  // The customer's own corrections: only values from the fixed lists get through.
  const SHAPES = ["Oval", "Round", "Square", "Heart", "Diamond", "Long"];
  const saidShape = body.details?.faceShape;
  const customerShape = typeof saidShape === "string" && SHAPES.includes(saidShape) ? saidShape : null;
  const faceShape = customerShape ?? body.faceShape;
  const lengths: readonly string[] = [...MEN_LENGTHS, ...WOMEN_LENGTHS];
  const details = body.details
    ? {
        gender,
        faceShape: customerShape,
        length: typeof body.details.length === "string" && lengths.includes(body.details.length) ? body.details.length : null,
        texture:
          typeof body.details.texture === "string" && ["straight", "wavy", "curly"].includes(body.details.texture)
            ? body.details.texture
            : null,
      }
    : null;

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
    const taken = mockReservePreview(userId);
    if (!taken) {
      return NextResponse.json(
        {
          error: "You have no hairstyles left. Choose a pack to see more styles on your own photo.",
          previewsLeft: 0,
          freePreviewsUsed: profile.freePreviewsUsed,
          freePreviewsLimit: profile.freePreviewsLimit,
        },
        { status: 402 }
      );
    }

    const result = await generateHairstyle({ sourceImageUrl: sourceImageUrl!, styleName, styleDescription, faceShape, gender });

    if (result.status !== "SUCCEEDED" || !result.resultImageUrl) {
      // Only a finished picture uses up a preview.
      mockReleasePreview(userId, taken);
      return NextResponse.json({ error: result.errorMessage || "Generation failed." }, { status: 502 });
    }

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
      paid: taken.kind === "paid",
      previewsLeft: mockPreviewsLeft(userId).total,
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
    analysed?.facialHair === "beard" || analysed?.facialHair === "moustache" || analysed?.facialHair === "clean" || analysed?.facialHair === "stubble"
      ? analysed.facialHair
      : null;
  // The customer's own correction comes first: it is their face.
  const analysedFaceShape: string | null = customerShape ?? photo.face_shape ?? faceShape ?? null;

  // Asked for again (a second tap, or the page reloaded): hand back the
  // picture already made for this photo and style. Nothing new is made or
  // counted.
  const { data: earlier } = await admin
    .from("style_results")
    .select("result_storage_path")
    .eq("user_id", userId)
    .eq("photo_id", photo.id)
    .eq("style_name", styleName)
    .eq("status", "SUCCEEDED")
    .not("result_storage_path", "is", null)
    .not("result_storage_path", "like", "http%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (earlier?.result_storage_path) {
    const { data: again } = await admin.storage.from("results").createSignedUrl(earlier.result_storage_path, RESULT_LINK_SECONDS);
    if (again?.signedUrl) {
      return NextResponse.json({
        mockMode: false,
        samplePreview: false,
        alreadyMade: true,
        resultImageUrl: again.signedUrl,
        previewsLeft: (await countPreviewsLeft(admin, userId)).total,
        freePreviewsUsed: profile?.free_previews_used ?? 0,
        freePreviewsLimit: profile?.free_previews_limit ?? 0,
      });
    }
  }

  if (details) {
    const { error: detailsError } = await admin.from("photos").update({ customer_details: details }).eq("id", photo.id);
    if (detailsError) console.error("[Tressform] Could not save the customer's details:", detailsError.message);
  }

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
        error: "You have no hairstyles left. Choose a pack to see more styles on your own photo.",
        previewsLeft: 0,
        freePreviewsUsed: profile.free_previews_limit,
        freePreviewsLimit: profile.free_previews_limit,
      },
      { status: 402 }
    );

  // Real generations cost money, so a preview is taken up front in one
  // atomic step (a free one first, then one from a pack) and handed back if
  // anything below fails. Placeholder generations (FAL still in mock mode)
  // are free and never counted.
  let reservation: Reservation | null = null;
  if (FALAI_MOCK_MODE) {
    if ((await countPreviewsLeft(admin, userId)).total <= 0) return limitReached();
  } else {
    try {
      reservation = await reservePreview(admin, userId);
    } catch (err) {
      console.error("[Tressform] Could not take a preview:", (err as Error).message);
      return NextResponse.json({ error: "We couldn't start your hairstyle — please try again." }, { status: 500 });
    }
    if (!reservation) return limitReached();
  }

  async function giveBack() {
    if (!reservation) return;
    const held = reservation;
    reservation = null;
    await releasePreview(admin, userId, held);
  }
  // Read now: giveBack() clears the reservation, and the records below need it.
  const paidOrderId = reservation?.kind === "paid" ? reservation.orderId : null;

  // The customer's own photo, to compare each preview against. If it can't
  // be read back the preview is still made; it just goes out unchecked.
  let originalBytes: Uint8Array | null = null;
  if (!FALAI_MOCK_MODE) {
    const { data: originalFile, error: originalError } = await admin.storage.from("photos").download(photo.storage_path);
    if (originalError || !originalFile) {
      console.error("[Tressform] Could not read the photo back for the preview check:", originalError?.message);
    } else {
      originalBytes = new Uint8Array(await originalFile.arrayBuffer());
    }
  }
  const originalPose = poseFromAnalysis(photo.rekognition_raw);

  let result: GenerateHairstyleResult | null = null;
  let imageBytes: Uint8Array | null = null;
  let imageType = extensionFor(null);
  let verdict: PreviewVerdict | null = null;
  let attempts = 0;
  let spentPaise = 0;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    try {
      result = await generateHairstyle({
        sourceImageUrl: signed.signedUrl,
        styleName,
        styleDescription,
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
    if (result.mock) break; // a placeholder image: nothing to fetch or check
    spentPaise += result.costPaise;

    try {
      const download = await fetch(result.resultImageUrl);
      if (!download.ok) throw new Error(`download ${download.status}`);
      imageType = extensionFor(result.contentType ?? download.headers.get("content-type"));
      imageBytes = new Uint8Array(await download.arrayBuffer());
    } catch (err) {
      console.error("[Tressform] Could not fetch generated preview:", (err as Error).message);
      await giveBack();
      return NextResponse.json({ error: "We couldn't save your hairstyle — please try again." }, { status: 502 });
    }

    verdict = await checkPreview(originalBytes, imageBytes, originalPose);
    console.log(`[Tressform] Preview check, attempt ${attempts} of "${styleName}": ${describeVerdict(verdict)}`);
    if (verdict.ok) break;
  }
  if (!result) {
    await giveBack();
    return NextResponse.json({ error: "Generation failed." }, { status: 502 });
  }

  const checkRecord = verdict ? { ...verdict, attempts } : null;

  // Every attempt failed the check: don't show it, don't count it, and
  // keep a record of what happened and what it cost.
  if (verdict && !verdict.ok) {
    await giveBack();
    const { error: failedInsertError } = await admin.from("style_results").insert({
      user_id: userId,
      photo_id: photo.id,
      style_name: styleName,
      status: "FAILED",
      provider: result.model,
      cost_paise: spentPaise,
      error_message: `Hairstyle check: ${describeVerdict(verdict)}`,
      check_result: checkRecord,
      completed_at: new Date().toISOString(),
    });
    if (failedInsertError) console.error("[Tressform] style_results insert (failed check) failed:", failedInsertError.message);
    return NextResponse.json(
      {
        error:
          "We couldn't make a true-to-you picture of this style, so it hasn't been counted. Please try another style, or a clearer photo facing the camera.",
        previewRejected: true,
      },
      { status: 422 }
    );
  }

  // Placeholder image: record it and return the placeholder link as-is.
  // Real image: copy it into the customer's private results folder first.
  let storedPath = result.resultImageUrl!;
  let linkForCustomer = result.resultImageUrl!;

  if (!result.mock && imageBytes) {
    try {
      const path = `${userId}/${randomUUID()}.${imageType.ext}`;

      const { error: uploadError } = await admin.storage
        .from("results")
        .upload(path, imageBytes, { contentType: imageType.type });
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
      return NextResponse.json({ error: "We couldn't save your hairstyle — please try again." }, { status: 502 });
    }
  }

  const { error: insertError } = await admin.from("style_results").insert({
    user_id: userId,
    photo_id: photo.id,
    style_name: styleName,
    status: "SUCCEEDED",
    // Set when this preview came from a pack: it marks the picture as paid for.
    order_id: paidOrderId,
    result_storage_path: storedPath,
    provider: result.mock ? "mock" : result.model,
    // What every attempt cost, not just the one that was kept.
    cost_paise: result.mock ? 0 : spentPaise,
    check_result: checkRecord,
    completed_at: new Date().toISOString(),
  });
  if (insertError) {
    // The customer still gets the image they were just charged an allowance
    // for; the missing record is ours to chase.
    console.error("[Tressform] style_results insert failed:", insertError.message);
  }

  const left = await countPreviewsLeft(admin, userId);
  const used = Math.max(0, profile.free_previews_limit - left.free);

  return NextResponse.json({
    mockMode: false,
    samplePreview: result.mock,
    resultImageUrl: linkForCustomer,
    paid: Boolean(paidOrderId),
    previewsLeft: left.total,
    freePreviewsUsed: used,
    freePreviewsLimit: profile.free_previews_limit,
  });
}

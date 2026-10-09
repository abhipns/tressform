// /api/generate — top-priority gap fix, paired with /api/analyze (see that
// route's header comment for context). Also closes a second gap from the
// doc's list: "free_previews_used is never read or incremented anywhere —
// zero enforcement of the 2-free-previews cap." This route is the one and
// only place that should ever increment it.
//
// Flow: FAL AI / PuLID Flux generates the styled image
// (lib/integrations/falai.ts, mock-mode aware on FAL_AI_API_KEY). Before
// calling it, this route checks the caller's profile —
// free_previews_used/free_previews_limit — and rejects once the lifetime
// cap of 2 is hit, since there is no checkout/paid-order flow yet for a
// generation past the free allowance to fall back to. Once orders/credits
// are wired up, the check here becomes "has free previews left OR has an
// unconsumed paid credit" instead of just the free-preview half.
//
// 09.10.2026 (real sign-in): in real mode the caller is identified from
// their login token, and the source image is looked up from THEIR OWN
// photos row (by photoId) rather than accepted from the request body — so
// nobody can generate against someone else's photo. While the image
// generator itself is still in mock mode, real accounts get placeholder
// images that do NOT use up a free preview (the response says
// samplePreview: true so the page can label them honestly).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateHairstyle } from "@/lib/integrations/falai";
import { mockStore } from "@/lib/mockStore";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

const SIGNED_URL_SECONDS = 600;

interface GenerateBody {
  userId?: string; // mock mode only — ignored when a real project is connected
  photoId?: string;
  sourceImageUrl?: string; // mock mode only — real mode reads it from the photos row
  styleName?: string;
  faceShape?: string | null;
}

export async function POST(req: NextRequest) {
  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { photoId, sourceImageUrl, styleName, faceShape } = body;

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

    const result = await generateHairstyle({ sourceImageUrl: sourceImageUrl!, styleName, faceShape });

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

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  // The photo must be one of the caller's own.
  const { data: photo, error: photoError } = await admin
    .from("photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("user_id", userId)
    .maybeSingle();
  if (photoError || !photo) {
    return NextResponse.json({ error: "We couldn't find that photo — please upload it again." }, { status: 404 });
  }

  const { data: signed, error: signError } = await admin.storage
    .from("photos")
    .createSignedUrl(photo.storage_path, SIGNED_URL_SECONDS);
  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "We couldn't open that photo — please upload it again." }, { status: 404 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, free_previews_used, free_previews_limit")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.error("[Tressform] No profile row for signed-in user", userId, profileError?.message);
    return NextResponse.json(
      { error: "We couldn't load your account. Please log out, log in again, and retry." },
      { status: 404 }
    );
  }

  if (profile.free_previews_used >= profile.free_previews_limit) {
    return NextResponse.json(
      {
        error: `You've used your ${profile.free_previews_limit} free previews — purchase a pack to keep generating.`,
        freePreviewsUsed: profile.free_previews_used,
        freePreviewsLimit: profile.free_previews_limit,
      },
      { status: 402 }
    );
  }

  let result;
  try {
    result = await generateHairstyle({ sourceImageUrl: signed.signedUrl, styleName, faceShape });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 502 }
    );
  }

  if (result.status !== "SUCCEEDED" || !result.resultImageUrl) {
    return NextResponse.json({ error: result.errorMessage || "Generation failed." }, { status: 502 });
  }

  const { error: insertError } = await admin.from("style_results").insert({
    user_id: userId,
    photo_id: photo.id,
    style_name: styleName,
    status: "SUCCEEDED",
    result_storage_path: result.resultImageUrl,
    provider: "fal_ai_pulid_flux",
    cost_paise: result.mock ? 0 : result.costPaise,
    completed_at: new Date().toISOString(),
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // A placeholder image (generator still in mock mode) is not a real
  // preview, so it doesn't spend the customer's free allowance.
  const used = result.mock ? profile.free_previews_used : profile.free_previews_used + 1;
  if (!result.mock) {
    const { error: updateError } = await admin
      .from("profiles")
      .update({ free_previews_used: used })
      .eq("id", userId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    mockMode: false,
    samplePreview: result.mock,
    resultImageUrl: result.resultImageUrl,
    freePreviewsUsed: used,
    freePreviewsLimit: profile.free_previews_limit,
  });
}

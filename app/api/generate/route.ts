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

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateHairstyle } from "@/lib/integrations/falai";
import { mockStore } from "@/lib/mockStore";

const SUPABASE_MOCK_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface GenerateBody {
  userId?: string;
  photoId?: string;
  sourceImageUrl?: string;
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

  const { userId, photoId, sourceImageUrl, styleName, faceShape } = body;

  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });
  if (!sourceImageUrl) return NextResponse.json({ error: "sourceImageUrl is required." }, { status: 400 });
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

    const result = await generateHairstyle({ sourceImageUrl, styleName, faceShape });

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

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, free_previews_used, free_previews_limit")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: profileError?.message ?? "No profile found for this user — sign-in/profile creation isn't wired up yet." },
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

  const result = await generateHairstyle({ sourceImageUrl, styleName, faceShape });

  if (result.status !== "SUCCEEDED" || !result.resultImageUrl) {
    return NextResponse.json({ error: result.errorMessage || "Generation failed." }, { status: 502 });
  }

  const { error: insertError } = await admin.from("style_results").insert({
    user_id: userId,
    photo_id: photoId,
    style_name: styleName,
    status: "SUCCEEDED",
    result_storage_path: result.resultImageUrl,
    provider: "fal_ai_pulid_flux",
    cost_paise: result.costPaise,
    completed_at: new Date().toISOString(),
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { error: updateError } = await admin
    .from("profiles")
    .update({ free_previews_used: profile.free_previews_used + 1 })
    .eq("id", userId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    mockMode: false,
    resultImageUrl: result.resultImageUrl,
    freePreviewsUsed: profile.free_previews_used + 1,
    freePreviewsLimit: profile.free_previews_limit,
  });
}

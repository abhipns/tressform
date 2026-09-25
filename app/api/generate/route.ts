// POST /api/generate
// Generate a hairstyle preview for a photo via FAL AI (PuLID Flux). Enforces
// the free-preview allowance (profiles.free_previews_used /
// free_previews_limit) before allowing an unpaid generation, and links a
// paid generation to its order when orderId is supplied.

import { NextResponse } from "next/server";
import { generateHairstyle, FALAI_MOCK_MODE } from "@/lib/integrations/falai";
import { getSupabaseAdmin, SUPABASE_MOCK_MODE } from "@/lib/supabaseClient";
import { mockStore } from "@/lib/mockStore";

interface GenerateRequestBody {
  userId: string;
  photoId: string;
  sourceImageUrl: string;
  styleName: string;
  faceShape?: string | null;
  addonKind?: "BACKGROUND" | "OUTFIT" | null;
  orderId?: string | null; // required unless this is within the free-preview allowance
}

export async function POST(req: Request) {
  let body: GenerateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.userId || !body.photoId || !body.sourceImageUrl || !body.styleName) {
    return NextResponse.json(
      { error: "userId, photoId, sourceImageUrl, and styleName are required." },
      { status: 400 }
    );
  }

  // --- Free-preview / paid-order gating ---
  if (!body.orderId) {
    if (SUPABASE_MOCK_MODE) {
      const profile = mockStore.getOrCreateProfile(body.userId);
      if (profile.freePreviewsUsed >= profile.freePreviewsLimit) {
        return NextResponse.json(
          { error: "Free preview already used. Purchase a pack to generate more styles." },
          { status: 402 }
        );
      }
      profile.freePreviewsUsed += 1;
    } else {
      const admin = getSupabaseAdmin();
      const { data: profile, error } = await admin
        .from("profiles")
        .select("free_previews_used, free_previews_limit")
        .eq("id", body.userId)
        .single();
      if (error || !profile) {
        return NextResponse.json({ error: "Could not load profile for free-preview check." }, { status: 500 });
      }
      if (profile.free_previews_used >= profile.free_previews_limit) {
        return NextResponse.json(
          { error: "Free preview already used. Purchase a pack to generate more styles." },
          { status: 402 }
        );
      }
      await admin
        .from("profiles")
        .update({ free_previews_used: profile.free_previews_used + 1 })
        .eq("id", body.userId);
    }
  }

  const result = await generateHairstyle({
    sourceImageUrl: body.sourceImageUrl,
    styleName: body.styleName,
    faceShape: body.faceShape,
    addonKind: body.addonKind,
  });

  let styleResultId: string | null = null;
  if (!SUPABASE_MOCK_MODE) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("style_results")
      .insert({
        user_id: body.userId,
        photo_id: body.photoId,
        order_id: body.orderId ?? null,
        style_name: body.styleName,
        addon_kind: body.addonKind ?? null,
        status: result.status,
        result_storage_path: result.resultImageUrl,
        cost_paise: result.costPaise,
        error_message: result.errorMessage ?? null,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: `Failed to save generation result: ${error.message}` }, { status: 500 });
    }
    styleResultId = data.id;
  }

  return NextResponse.json({
    styleResultId,
    status: result.status,
    resultImageUrl: result.resultImageUrl,
    mock: FALAI_MOCK_MODE || SUPABASE_MOCK_MODE,
  });
}

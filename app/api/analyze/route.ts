// POST /api/analyze
// Analyze an uploaded photo: AWS Rekognition face detection -> our own
// face-shape classifier (see lib/faceShape.ts). Runs fully in mock mode
// when AWS credentials are absent (lib/integrations/rekognition.ts).

import { NextResponse } from "next/server";
import { detectFace, REKOGNITION_MOCK_MODE } from "@/lib/integrations/rekognition";
import { classifyFaceShape } from "@/lib/faceShape";
import { getSupabaseAdmin, SUPABASE_MOCK_MODE } from "@/lib/supabaseClient";

interface AnalyzeRequestBody {
  userId: string;
  consentGiven: boolean;
  photoUrl?: string; // signed Supabase Storage URL, or a data URL for local testing
  storagePath?: string; // where the photo was already uploaded, if any
}

export async function POST(req: Request) {
  let body: AnalyzeRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  if (!body.consentGiven) {
    return NextResponse.json(
      {
        error:
          "Consent is required: 'I consent to my photo being analyzed for facial geometry and haircut recommendations.'",
      },
      { status: 400 }
    );
  }
  if (!body.photoUrl && !body.storagePath) {
    return NextResponse.json({ error: "photoUrl or storagePath is required." }, { status: 400 });
  }

  const detection = await detectFace(body.photoUrl ?? body.storagePath!);
  if (!detection.faceDetected) {
    return NextResponse.json({ error: "No face detected in the photo. Please try another photo." }, { status: 422 });
  }

  const classification = classifyFaceShape(detection);

  let photoId: string | null = null;
  if (!SUPABASE_MOCK_MODE) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("photos")
      .insert({
        user_id: body.userId,
        storage_path: body.storagePath ?? body.photoUrl ?? "unknown",
        face_shape: classification.faceShape,
        face_shape_confidence: classification.confidence,
        rekognition_raw: detection.raw,
      })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: `Failed to save photo analysis: ${error.message}` }, { status: 500 });
    }
    photoId = data.id;
  }

  return NextResponse.json({
    photoId,
    faceShape: classification.faceShape,
    confidence: classification.confidence,
    mock: REKOGNITION_MOCK_MODE || SUPABASE_MOCK_MODE,
  });
}

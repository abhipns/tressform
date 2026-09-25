// /api/analyze — top-priority gap fix (Master Section Plan doc, gap list
// round 2): UploadFlow.tsx has called this route since it was built, but the
// route itself never existed, so the entire AI demo was broken end-to-end.
//
// Flow (per spec Part H, "our stack"): AWS Rekognition DetectFaces for
// landmarks (lib/integrations/rekognition.ts) → our own classifier turns
// those landmarks into a face shape (lib/faceShape.ts, currently the
// placeholder heuristic — see that file's header for the real-model plan).
//
// Mock mode is two independent layers, same as the rest of the app:
//   - REKOGNITION_MOCK_MODE (lib/integrations/rekognition.ts): fakes the AWS
//     call when REKOGNITION_AWS_* env vars are absent. Runs the SAME either
//     way — this route never branches on it directly.
//   - SUPABASE_MOCK_MODE (lib/supabaseClient.ts): whether the resulting
//     photo row is persisted to a real Supabase project or kept in
//     lib/mockStore.ts for this process's lifetime only.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { detectFace } from "@/lib/integrations/rekognition";
import { classifyFaceShape } from "@/lib/faceShape";
import { mockStore } from "@/lib/mockStore";

// Mirrors lib/supabaseClient.ts's own check — see app/api/admin/carousel/route.ts
// for why this route doesn't import that module directly.
const SUPABASE_MOCK_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface AnalyzeBody {
  userId?: string;
  consentGiven?: boolean;
  photoUrl?: string; // data: URL from the browser's FileReader, or a Supabase Storage URL once upload is wired client-side
}

export async function POST(req: NextRequest) {
  let body: AnalyzeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { userId, consentGiven, photoUrl } = body;

  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });
  if (!photoUrl) return NextResponse.json({ error: "photoUrl is required — upload a photo first." }, { status: 400 });
  if (!consentGiven) {
    return NextResponse.json(
      { error: "Consent is required before we can analyze your photos." },
      { status: 400 }
    );
  }

  let detection;
  try {
    detection = await detectFace(photoUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Face detection failed." },
      { status: 502 }
    );
  }

  if (!detection.faceDetected) {
    return NextResponse.json(
      { error: "We couldn't detect a face in that photo — try a clearer, front-facing shot." },
      { status: 422 }
    );
  }

  const classification = classifyFaceShape(detection);

  if (SUPABASE_MOCK_MODE) {
    const photo = mockStore.addPhoto({
      id: randomUUID(),
      userId,
      storagePath: photoUrl,
      faceShape: classification.faceShape,
      faceShapeConfidence: classification.confidence,
      rekognitionRaw: detection.raw,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({
      mockMode: true,
      photoId: photo.id,
      faceShape: classification.faceShape,
      confidence: classification.confidence,
    });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  // Real mode still stores the incoming data: URL directly in storage_path
  // for now — uploading it to Supabase Storage first (and swapping this for
  // the resulting object path) is a separate, small follow-up once a real
  // project is connected; the row shape below already matches db/schema.sql
  // so that swap won't require a migration.
  const { data: photo, error } = await admin
    .from("photos")
    .insert({
      user_id: userId,
      storage_path: photoUrl,
      face_shape: classification.faceShape,
      face_shape_confidence: classification.confidence,
      rekognition_raw: detection.raw,
    })
    .select()
    .single();

  if (error || !photo) {
    return NextResponse.json({ error: error?.message ?? "Failed to save photo analysis." }, { status: 500 });
  }

  return NextResponse.json({
    mockMode: false,
    photoId: photo.id,
    faceShape: classification.faceShape,
    confidence: classification.confidence,
  });
}

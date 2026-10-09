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
//
// 09.10.2026 (real sign-in): in real mode the caller is identified from
// their login token (lib/serverAuth.ts), never from the request body, and
// the photo arrives as a path in the private "photos" storage bucket that
// the browser has already uploaded to — not as a data: URL. The path must
// sit inside the caller's own folder ("<their user id>/…").

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { detectFace } from "@/lib/integrations/rekognition";
import { classifyFaceShape } from "@/lib/faceShape";
import { mockStore } from "@/lib/mockStore";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

const SIGNED_URL_SECONDS = 600;

interface AnalyzeBody {
  userId?: string; // mock mode only — ignored when a real project is connected
  consentGiven?: boolean;
  photoUrl?: string; // mock mode: data: URL of the (browser-shrunk) front photo
  storagePath?: string; // real mode: front photo's path in the "photos" bucket
  extraPaths?: string[]; // real mode: the left/right photos, same folder
}

function ownsPath(path: unknown, userId: string): path is string {
  return typeof path === "string" && path.startsWith(`${userId}/`) && !path.includes("..");
}

export async function POST(req: NextRequest) {
  let body: AnalyzeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { consentGiven, photoUrl, storagePath, extraPaths } = body;

  const auth = await requireUser(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.userId;

  if (SUPABASE_MOCK_MODE && !photoUrl) {
    return NextResponse.json({ error: "photoUrl is required — upload a photo first." }, { status: 400 });
  }
  if (!SUPABASE_MOCK_MODE) {
    if (!ownsPath(storagePath, userId) || (extraPaths ?? []).some((p) => !ownsPath(p, userId))) {
      return NextResponse.json({ error: "We couldn't find your uploaded photos — please upload them again." }, { status: 400 });
    }
  }
  if (!consentGiven) {
    return NextResponse.json(
      { error: "Consent is required before we can analyze your photos." },
      { status: 400 }
    );
  }

  // What face detection reads: the data: URL in mock mode, or a short-lived
  // signed link to the private file in real mode (which also proves the
  // file really exists before we record it).
  let imageForDetection = photoUrl ?? "";
  if (!SUPABASE_MOCK_MODE) {
    const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
    const { data: signed, error: signError } = await getSupabaseAdmin()
      .storage.from("photos")
      .createSignedUrl(storagePath!, SIGNED_URL_SECONDS);
    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: "We couldn't find your uploaded photos — please upload them again." }, { status: 400 });
    }
    imageForDetection = signed.signedUrl;
  }

  let detection;
  try {
    detection = await detectFace(imageForDetection);
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
      storagePath: photoUrl!,
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

  // One row per analysis, pointing at the FRONT photo (the one face
  // detection ran on). The left/right photos live beside it in the same
  // storage folder, so they can be found from this path when needed.
  const { data: photo, error } = await admin
    .from("photos")
    .insert({
      user_id: userId,
      storage_path: storagePath,
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

// /api/analyze — top-priority gap fix (Master Section Plan doc, gap list
// round 2): UploadFlow.tsx has called this route since it was built, but the
// route itself never existed, so the entire AI demo was broken end-to-end.
//
// Flow (per spec Part H, "our stack"): AWS Rekognition DetectFaces for
// landmarks (lib/integrations/rekognition.ts) → our own classifier turns
// those landmarks into a face shape (lib/faceShape.ts — rule-based for now,
// see that file's header for the trained-model plan).
//
// Mock mode is two independent layers, same as the rest of the app:
//   - REKOGNITION_MOCK_MODE (lib/integrations/rekognition.ts): fakes the AWS
//     call when REKOGNITION_AWS_* env vars are absent.
//   - SUPABASE_MOCK_MODE (lib/serverAuth.ts): whether the resulting photo
//     row is persisted to a real Supabase project or kept in
//     lib/mockStore.ts for this process's lifetime only.
//
// 09.10.2026 (real sign-in): in real mode the caller is identified from
// their login token (lib/serverAuth.ts), never from the request body, and
// the photo arrives as a path in the private "photos" storage bucket that
// the browser has already uploaded to — not as a data: URL. The path must
// sit inside the caller's own folder ("<their user id>/…").
//
// 09.10.2026 (real face analysis): the server now reads the photo's actual
// bytes (from private storage) and sends those to Rekognition, turns a
// photo we can't use into a specific, fixable message ("more than one
// face", "take off your sunglasses", …) instead of a wrong answer, deletes
// the uploaded files when a photo is turned away, and stores the
// classifier's measurements alongside the result so its thresholds can be
// tuned from real photos.
//
// 11.10.2026 (the photo reading): those measurements turned out to say
// almost nothing: 22 of the first 23 real photos were called "Oval",
// because the jaw and forehead figures come out the same for every face.
// The photo is now also read by a vision model (lib/integrations/vision.ts)
// for face shape, hair length and hair type, at the same moment as the face
// service checks the photo, so the customer waits no longer. Its face shape
// is the one used. If that reading fails, the old measurement is used and
// marked as unsure, and the page asks the customer to check it. The page
// also says whose hairstyles are wanted (men's or women's), because hair
// length is described differently for each.
//
// 11.10.2026 (later): the photo is read twice, with two wordings of the
// same question. When the two name different face shapes the reading is
// marked unsure and the page asks the customer to check it; see
// readPhotoTwice for why.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  detectFace,
  toImageBytes,
  MOCK_IMAGE_SIZE,
  REKOGNITION_MOCK_MODE,
  type DetectFaceResult,
} from "@/lib/integrations/rekognition";
import { classifyFaceShape } from "@/lib/faceShape";
import { readPhotoTwice, type CheckedReading } from "@/lib/integrations/vision";
import { FALAI_MOCK_MODE } from "@/lib/integrations/falai";
import { readImageSize } from "@/lib/imageSize";
import { mockStore } from "@/lib/mockStore";
import { mockPreviewsLeft, previewsLeft as countPreviewsLeft } from "@/lib/allowance";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

const NOT_FOUND_MESSAGE = "We couldn't find your uploaded photos — please upload them again.";

interface AnalyzeBody {
  userId?: string; // mock mode only — ignored when a real project is connected
  consentGiven?: boolean;
  photoUrl?: string; // mock mode: data: URL of the (browser-shrunk) front photo
  storagePath?: string; // real mode: front photo's path in the "photos" bucket
  extraPaths?: string[]; // real mode: the left/right photos, same folder
  /** Whose hairstyles the customer asked for. Without it the photo is not read for hair. */
  gender?: string;
}

// How long the model gets to open the photo through its private link.
const READING_LINK_SECONDS = 300;
// The face-shape confidence stored with the photo (0–100), from how sure the reading said it was.
const CONFIDENCE = { high: 80, medium: 65, low: 50 } as const;

function ownsPath(path: unknown, userId: string): path is string {
  return typeof path === "string" && path.startsWith(`${userId}/`) && !path.includes("..");
}

/** Why this front photo can't be analysed — or null if it's fine. */
function photoProblem(d: DetectFaceResult): string | null {
  if (!d.faceDetected) {
    return "We couldn't detect a face in that photo — try a clearer, front-facing shot.";
  }
  if (d.faceCount > 1) {
    return "We found more than one face in your Front photo — please use a photo of just you.";
  }
  if (d.sunglasses) {
    return "Please take off your sunglasses for the Front photo — we need to see your whole face.";
  }
  if (d.boundingBox.height < 0.12) {
    return "Your face is too small in the Front photo — please move closer to the camera.";
  }
  if (d.pose && (Math.abs(d.pose.yaw) > 25 || Math.abs(d.pose.pitch) > 25)) {
    return "Please look straight at the camera for the Front photo — your head is turned or tilted.";
  }
  // 11.10.2026: a last line of defence on photo quality. The real light
  // check happens in the browser (lib/photoLight.ts); these two only stop
  // a photo the face service itself scores as very dark or very blurred.
  // They are set low on purpose: its brightness score cannot tell a poor
  // selfie (69.7) from a well-lit portrait (71.0), so it is only trusted
  // at the extreme.
  if (d.quality && d.quality.brightness < 40) {
    return "Your Front photo is too dark — face a window or switch on a light in front of you, then take it again.";
  }
  if (d.quality && d.quality.sharpness < 35) {
    return "Your Front photo is blurred — hold the phone still, or rest it against something, and take it again.";
  }
  return null;
}

/**
 * 12.10.2026: the customer's approximate city, for matching with salons
 * later. Vercel works it out from the internet connection (no pop-up, not
 * exact — a mobile network may show a nearby city). Never fails the reading.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveApproxLocation(admin: any, userId: string, req: NextRequest): Promise<void> {
  const read = (h: string) => {
    const v = req.headers.get(h);
    if (!v) return null;
    try {
      return decodeURIComponent(v).slice(0, 80);
    } catch {
      return v.slice(0, 80);
    }
  };
  const city = read("x-vercel-ip-city");
  const country = read("x-vercel-ip-country");
  if (!city && !country) return;
  try {
    await admin
      .from("profiles")
      .update({
        approx_city: city,
        approx_region: read("x-vercel-ip-country-region"),
        approx_country: country,
        approx_location_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch (err) {
    console.warn("[Tressform] could not save approximate location:", err);
  }
}

export async function POST(req: NextRequest) {
  let body: AnalyzeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { consentGiven, photoUrl, storagePath, extraPaths } = body;
  const gender = body.gender === "men" || body.gender === "women" ? body.gender : null;

  const auth = await requireUser(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.userId;

  if (SUPABASE_MOCK_MODE && !photoUrl) {
    return NextResponse.json({ error: "photoUrl is required — upload a photo first." }, { status: 400 });
  }
  if (!SUPABASE_MOCK_MODE) {
    if (!ownsPath(storagePath, userId) || (extraPaths ?? []).some((p) => !ownsPath(p, userId))) {
      return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 400 });
    }
  }
  if (!consentGiven) {
    return NextResponse.json(
      { error: "Consent is required before we can analyze your photos." },
      { status: 400 }
    );
  }

  const admin = SUPABASE_MOCK_MODE ? null : (await import("@/lib/supabaseClient")).getSupabaseAdmin();

  /** Real mode: a photo we're turning away shouldn't be left sitting in storage. */
  async function discardUploads() {
    if (!admin) return;
    const paths = [storagePath!, ...(extraPaths ?? [])];
    const { error } = await admin.storage.from("photos").remove(paths);
    if (error) console.error("[Tressform] Could not remove rejected uploads:", error.message);
  }

  // The front photo's bytes: from private storage in real mode (which also
  // proves the file exists), or from the data: URL in mock mode. Mock-mode
  // face detection never reads them, so they're only decoded when needed.
  let bytes: Uint8Array | null = null;
  try {
    if (admin) {
      const { data: file, error: downloadError } = await admin.storage.from("photos").download(storagePath!);
      if (downloadError || !file) {
        return NextResponse.json({ error: NOT_FOUND_MESSAGE }, { status: 400 });
      }
      bytes = new Uint8Array(await file.arrayBuffer());
    } else if (!REKOGNITION_MOCK_MODE) {
      bytes = await toImageBytes(photoUrl!);
    }
  } catch {
    return NextResponse.json({ error: "We couldn't read that photo — please try another one." }, { status: 400 });
  }

  // The reading runs alongside the face check rather than after it. A photo
  // the face check turns away has then been read for nothing, which costs a
  // fraction of a rupee; doing them in turn would cost every customer a few
  // seconds. The reading never throws.
  const reading: Promise<CheckedReading | null> = (async () => {
    if (!gender) return null;
    if (!admin) return readPhotoTwice(photoUrl!, gender);
    const { data: link, error: linkError } = await admin.storage
      .from("photos")
      .createSignedUrl(storagePath!, READING_LINK_SECONDS);
    if (linkError || !link?.signedUrl) {
      console.error("[Tressform] No link for the photo reading:", linkError?.message);
      return null;
    }
    return readPhotoTwice(link.signedUrl, gender);
  })().catch((err) => {
    console.error("[Tressform] Photo reading could not start:", (err as Error)?.message);
    return null;
  });

  let detection: DetectFaceResult;
  try {
    detection = await detectFace(bytes ?? photoUrl!);
  } catch (err) {
    await discardUploads();
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Face detection failed." },
      { status: 502 }
    );
  }

  const problem = photoProblem(detection);
  if (problem) {
    await discardUploads();
    return NextResponse.json({ error: problem }, { status: 422 });
  }

  const imageSize = detection.mock ? MOCK_IMAGE_SIZE : bytes ? readImageSize(bytes) : null;
  const classification = classifyFaceShape(detection, imageSize);
  const read = await reading;

  // The face shape the customer is shown: the reading's when there is one,
  // otherwise the measurement's, marked as unsure so the page asks them to
  // check it.
  const face =
    read?.ok && read.faceShape
      ? {
          shape: read.faceShape,
          second: read.secondFaceShape,
          sure: read.sure ?? ("medium" as const),
          confidence: CONFIDENCE[read.sure ?? "medium"],
          readBy: "reading" as const,
        }
      : {
          shape: classification.faceShape,
          second: null,
          sure: "low" as const,
          confidence: Math.min(classification.confidence, 45),
          readBy: "measurement" as const,
        };
  const forPage = {
    faceShape: face.shape,
    secondFaceShape: face.second,
    sure: face.sure,
    readBy: face.readBy,
    confidence: face.confidence,
    gender,
    hair: { length: read?.hairLength ?? null, texture: read?.hairTexture ?? null },
  };

  // Stored with the photo for audit and for tuning the classifier later.
  const analysisRecord = {
    ...detection.raw,
    tressform: {
      classifier: classification.version,
      features: classification.features,
      measuredShape: classification.faceShape,
      imageSize,
      // The vision model's reading, kept whole (what it saw, what it
      // answered, what it cost) so its answers can be checked.
      reading: read,
      gender,
      // Read back by /api/generate so the image model is told, as a fact,
      // whether to keep the customer clean-shaven or keep their beard.
      facialHair: detection.facialHair,
    },
  };

  if (!admin) {
    const photo = mockStore.addPhoto({
      id: randomUUID(),
      userId,
      storagePath: photoUrl!,
      faceShape: face.shape,
      faceShapeConfidence: face.confidence,
      rekognitionRaw: analysisRecord,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({
      mockMode: true,
      photoId: photo.id,
      ...forPage,
      previewsLeft: mockPreviewsLeft(userId).total,
    });
  }

  // One row per analysis, pointing at the FRONT photo (the one face
  // detection ran on). The left/right photos live beside it in the same
  // storage folder, so they can be found from this path when needed.
  // Saved alongside a count of the previews the customer has left (free
  // ones plus any from a pack), which the result screen shows. (Both run
  // together — they don't depend on each other.)
  const [{ data: photo, error }, left] = await Promise.all([
    admin
      .from("photos")
      .insert({
        user_id: userId,
        storage_path: storagePath,
        face_shape: face.shape,
        face_shape_confidence: face.confidence,
        rekognition_raw: analysisRecord,
      })
      .select()
      .single(),
    countPreviewsLeft(admin, userId),
    saveApproxLocation(admin, userId, req),
  ]);

  if (error || !photo) {
    return NextResponse.json({ error: error?.message ?? "Failed to save photo analysis." }, { status: 500 });
  }

  // null = "not being counted right now" (placeholder images while the image
  // generator is in mock mode are free and unlimited).
  const previewsLeft = FALAI_MOCK_MODE ? null : left.total;

  return NextResponse.json({
    mockMode: false,
    photoId: photo.id,
    ...forPage,
    previewsLeft,
  });
}

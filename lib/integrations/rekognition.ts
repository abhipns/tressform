// Tressform — AWS Rekognition integration (face detection + landmarks).
//
// Flow (per spec Part H, "our stack"): send the customer's front photo to
// Rekognition DetectFaces to get the face's bounding box, pose and landmark
// points; lib/faceShape.ts then turns those points into a face shape. This
// module only wraps the AWS call.
//
// MOCK MODE: when REKOGNITION_AWS_ACCESS_KEY_ID / _SECRET_ACCESS_KEY are
// absent, every call returns one realistic fake face instead of hitting AWS,
// so the rest of the app runs with zero AWS setup.
//
// 09.10.2026: real implementation wired up (was a commented-out sketch).
//   - Only the attributes this app needs are requested: the default set
//     (box, confidence, pose, quality, landmarks) plus sunglasses and
//     occlusion. Age range, gender and emotion estimates are deliberately
//     NOT requested — we have no use for them and shouldn't hold them.
//   - What gets stored for audit/retraining (`raw`) is a trimmed copy of the
//     main face only, not the whole provider response.
//   - The landmark names are Rekognition's own (upperJawlineLeft,
//     midJawlineLeft, chinBottom, leftEyeBrowUp, …). The mock face below uses
//     the same names so lib/faceShape.ts has one code path for both modes.

// NOTE: deliberately namespaced as REKOGNITION_AWS_* rather than the bare
// AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY convention — some hosting/dev
// environments inject their own generic AWS_* credentials for unrelated
// infrastructure, which would otherwise silently take this integration out
// of mock mode with the wrong keys.
const AWS_ACCESS_KEY_ID = process.env.REKOGNITION_AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.REKOGNITION_AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.REKOGNITION_AWS_REGION || "ap-south-1";

export const REKOGNITION_MOCK_MODE = !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY;

export interface FaceLandmark {
  type: string; // Rekognition's landmark name, e.g. "eyeLeft", "chinBottom", "midJawlineLeft"
  x: number; // 0..1, fraction of the image WIDTH from the left edge
  y: number; // 0..1, fraction of the image HEIGHT from the top edge
}

export interface DetectFaceResult {
  faceDetected: boolean;
  /** How many faces of comparable size are in the photo (background faces much smaller than the main one are ignored). */
  faceCount: number;
  boundingBox: { width: number; height: number; left: number; top: number };
  landmarks: FaceLandmark[];
  confidence: number; // 0..100, Rekognition's own detection confidence
  /** Head rotation in degrees. yaw = turned left/right, pitch = tilted up/down, roll = head tilted sideways. */
  pose: { roll: number; yaw: number; pitch: number } | null;
  quality: { brightness: number; sharpness: number } | null;
  sunglasses: boolean;
  raw: Record<string, unknown>; // trimmed provider response for the main face, stored for audit/retraining
  mock: boolean;
}

/**
 * A plausible, front-facing oval face in a 3:4 portrait photo. The
 * fractions only make sense on that 3:4 canvas — see MOCK_IMAGE_SIZE.
 */
const MOCK_LANDMARKS: FaceLandmark[] = [
  { type: "eyeLeft", x: 0.41, y: 0.395 },
  { type: "eyeRight", x: 0.59, y: 0.395 },
  { type: "nose", x: 0.5, y: 0.47 },
  { type: "mouthLeft", x: 0.43, y: 0.55 },
  { type: "mouthRight", x: 0.57, y: 0.55 },
  { type: "leftEyeBrowLeft", x: 0.332, y: 0.365 },
  { type: "leftEyeBrowUp", x: 0.4, y: 0.35 },
  { type: "leftEyeBrowRight", x: 0.46, y: 0.36 },
  { type: "rightEyeBrowLeft", x: 0.54, y: 0.36 },
  { type: "rightEyeBrowUp", x: 0.6, y: 0.35 },
  { type: "rightEyeBrowRight", x: 0.668, y: 0.365 },
  { type: "upperJawlineLeft", x: 0.29, y: 0.42 },
  { type: "midJawlineLeft", x: 0.3215, y: 0.56 },
  { type: "chinBottom", x: 0.5, y: 0.674 },
  { type: "midJawlineRight", x: 0.6785, y: 0.56 },
  { type: "upperJawlineRight", x: 0.71, y: 0.42 },
];

/** The canvas the mock face above was drawn on. Use this instead of the real photo's size in mock mode. */
export const MOCK_IMAGE_SIZE = { width: 3, height: 4 } as const;

function mockResult(): DetectFaceResult {
  return {
    faceDetected: true,
    faceCount: 1,
    boundingBox: { width: 0.44, height: 0.5, left: 0.28, top: 0.2 },
    landmarks: MOCK_LANDMARKS,
    confidence: 98.7,
    pose: { roll: 0, yaw: 0, pitch: 0 },
    quality: { brightness: 80, sharpness: 80 },
    sunglasses: false,
    raw: { mock: true, region: AWS_REGION, note: "REKOGNITION_AWS_ACCESS_KEY_ID not set — see .env.example" },
    mock: true,
  };
}

function emptyResult(mock: boolean, raw: Record<string, unknown>): DetectFaceResult {
  return {
    faceDetected: false,
    faceCount: 0,
    boundingBox: { width: 0, height: 0, left: 0, top: 0 },
    landmarks: [],
    confidence: 0,
    pose: null,
    quality: null,
    sunglasses: false,
    raw,
    mock,
  };
}

/** Turn whatever the caller has (bytes, a data: URL, or an http(s) link) into image bytes. */
export async function toImageBytes(image: Uint8Array | string): Promise<Uint8Array> {
  if (typeof image !== "string") return image;
  if (image.startsWith("data:")) {
    const comma = image.indexOf(",");
    if (comma === -1) throw new Error("That photo couldn't be read.");
    return new Uint8Array(Buffer.from(image.slice(comma + 1), "base64"));
  }
  const res = await fetch(image);
  if (!res.ok) throw new Error("That photo couldn't be opened.");
  return new Uint8Array(await res.arrayBuffer());
}

/** Friendly wording for the AWS failures a customer (or we, during setup) can actually hit. */
function describeAwsError(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  switch (name) {
    case "ImageTooLargeException":
      return "That photo is too large — please try a smaller one.";
    case "InvalidImageFormatException":
      return "That photo couldn't be read — please try a JPG or PNG image.";
    case "ThrottlingException":
    case "ProvisionedThroughputExceededException":
      return "We're a little busy right now — please try again in a moment.";
    default:
      // Everything else (wrong keys, account not activated yet, region
      // problems…) is ours to fix, not the customer's. Log the real reason.
      console.error("[Tressform] Rekognition DetectFaces failed:", name, (err as Error)?.message);
      return "Face analysis isn't available right now — please try again shortly.";
  }
}

/**
 * Detect the face (and its landmarks) in a photo.
 * `image` is image bytes, a data: URL, or an http(s) link (e.g. a Supabase
 * Storage signed URL). JPEG or PNG, up to 5MB.
 */
export async function detectFace(image: Uint8Array | string): Promise<DetectFaceResult> {
  if (REKOGNITION_MOCK_MODE) return mockResult();

  const bytes = await toImageBytes(image);

  const { RekognitionClient, DetectFacesCommand } = await import("@aws-sdk/client-rekognition");
  const client = new RekognitionClient({
    region: AWS_REGION,
    credentials: { accessKeyId: AWS_ACCESS_KEY_ID!, secretAccessKey: AWS_SECRET_ACCESS_KEY! },
  });

  let response;
  try {
    response = await client.send(
      new DetectFacesCommand({
        Image: { Bytes: bytes },
        Attributes: ["DEFAULT", "SUNGLASSES", "FACE_OCCLUDED"],
      })
    );
  } catch (err) {
    throw new Error(describeAwsError(err));
  }

  const faces = (response.FaceDetails ?? []).filter((f) => (f.Confidence ?? 0) >= 90 && f.BoundingBox);
  if (faces.length === 0) return emptyResult(false, { faces: 0, region: AWS_REGION });

  const area = (f: (typeof faces)[number]) => (f.BoundingBox?.Width ?? 0) * (f.BoundingBox?.Height ?? 0);
  faces.sort((a, b) => area(b) - area(a));
  const main = faces[0];
  // A poster or a passer-by in the background shouldn't count as "two
  // people in the photo" — only faces at least a quarter the size of the
  // main one do.
  const faceCount = faces.filter((f) => area(f) >= area(main) * 0.25).length;

  const box = main.BoundingBox!;
  const landmarks: FaceLandmark[] = (main.Landmarks ?? [])
    .filter((l) => l.Type && typeof l.X === "number" && typeof l.Y === "number")
    .map((l) => ({ type: l.Type as string, x: l.X as number, y: l.Y as number }));

  const pose = main.Pose
    ? { roll: main.Pose.Roll ?? 0, yaw: main.Pose.Yaw ?? 0, pitch: main.Pose.Pitch ?? 0 }
    : null;
  const quality = main.Quality
    ? { brightness: main.Quality.Brightness ?? 0, sharpness: main.Quality.Sharpness ?? 0 }
    : null;
  const sunglasses = Boolean(main.Sunglasses?.Value) && (main.Sunglasses?.Confidence ?? 0) >= 90;

  return {
    faceDetected: true,
    faceCount,
    boundingBox: { width: box.Width ?? 0, height: box.Height ?? 0, left: box.Left ?? 0, top: box.Top ?? 0 },
    landmarks,
    confidence: main.Confidence ?? 0,
    pose,
    quality,
    sunglasses,
    raw: {
      region: AWS_REGION,
      facesInPhoto: faces.length,
      boundingBox: main.BoundingBox,
      confidence: main.Confidence,
      pose: main.Pose,
      quality: main.Quality,
      landmarks: main.Landmarks,
      sunglasses: main.Sunglasses,
      faceOccluded: main.FaceOccluded,
    },
    mock: false,
  };
}

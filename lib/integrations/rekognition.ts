// Tressform — AWS Rekognition integration (face-shape classification input).
//
// Production flow (per spec Part H, "our stack"): upload photo to Rekognition
// DetectFaces to get facial landmarks, then run those landmarks through our
// own in-house-trained classifier (see the Part H face-shape-classifier
// build task) to produce a face shape. This module only wraps the AWS call;
// the landmark → face-shape mapping lives in lib/faceShape.ts (task #13/#14).
//
// MOCK MODE: when AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are absent, every
// call returns realistic fake landmark data instead of hitting AWS, so the
// rest of the app (and its tests) can run with zero AWS setup.

// NOTE: deliberately namespaced as REKOGNITION_AWS_* rather than the bare
// AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY convention — some hosting/dev
// environments (including this build sandbox) inject their own generic
// AWS_* credentials for unrelated infrastructure, which would otherwise
// silently take this integration out of mock mode with the wrong keys.
const AWS_ACCESS_KEY_ID = process.env.REKOGNITION_AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.REKOGNITION_AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.REKOGNITION_AWS_REGION || "ap-south-1";

export const REKOGNITION_MOCK_MODE = !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY;

export interface FaceLandmark {
  type: string; // e.g. "eyeLeft", "eyeRight", "nose", "mouthLeft", "mouthLeft", "chinBottom", "jawlineLeft", ...
  x: number; // normalized 0..1
  y: number; // normalized 0..1
}

export interface DetectFaceResult {
  faceDetected: boolean;
  boundingBox: { width: number; height: number; left: number; top: number };
  landmarks: FaceLandmark[];
  confidence: number; // 0..100, Rekognition's own detection confidence
  raw: Record<string, unknown>; // full provider response, stored for audit/retraining
  mock: boolean;
}

const MOCK_LANDMARK_TYPES = [
  "eyeLeft",
  "eyeRight",
  "nose",
  "mouthLeft",
  "mouthRight",
  "chinBottom",
  "jawlineLeft",
  "jawlineRight",
  "foreheadCenter",
  "cheekboneLeft",
  "cheekboneRight",
];

function buildMockLandmarks(): FaceLandmark[] {
  return MOCK_LANDMARK_TYPES.map((type, i) => ({
    type,
    x: 0.3 + ((i * 37) % 40) / 100,
    y: 0.15 + ((i * 53) % 70) / 100,
  }));
}

/**
 * Detect a face and its landmarks in an uploaded photo.
 * `imageBytesOrUrl` is either a Buffer of image bytes or a Supabase Storage
 * signed URL — the real implementation would pass Bytes directly to the AWS
 * SDK's `DetectFacesCommand`.
 */
export async function detectFace(imageBytesOrUrl: Buffer | string): Promise<DetectFaceResult> {
  if (REKOGNITION_MOCK_MODE) {
    return {
      faceDetected: true,
      boundingBox: { width: 0.42, height: 0.55, left: 0.29, top: 0.18 },
      landmarks: buildMockLandmarks(),
      confidence: 98.7,
      raw: { mock: true, region: AWS_REGION, note: "AWS_ACCESS_KEY_ID not set — see .env.example" },
      mock: true,
    };
  }

  // Real implementation (uncomment once @aws-sdk/client-rekognition is added
  // and credentials are set):
  //
  // const { RekognitionClient, DetectFacesCommand } = await import("@aws-sdk/client-rekognition");
  // const client = new RekognitionClient({
  //   region: AWS_REGION,
  //   credentials: { accessKeyId: AWS_ACCESS_KEY_ID!, secretAccessKey: AWS_SECRET_ACCESS_KEY! },
  // });
  // const bytes = typeof imageBytesOrUrl === "string"
  //   ? await (await fetch(imageBytesOrUrl)).arrayBuffer().then((b) => new Uint8Array(b))
  //   : imageBytesOrUrl;
  // const res = await client.send(new DetectFacesCommand({ Image: { Bytes: bytes }, Attributes: ["ALL"] }));
  // ... map res.FaceDetails[0].Landmarks -> FaceLandmark[] ...

  throw new Error(
    "REKOGNITION_MOCK_MODE is false but the real AWS SDK call is not wired up yet — " +
      "install @aws-sdk/client-rekognition and implement detectFace()."
  );
}

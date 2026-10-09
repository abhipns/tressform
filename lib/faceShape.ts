// Tressform — face-shape classifier (Part H "our stack": Rekognition
// landmarks in, our own classifier out).
//
// 09.10.2026 — "heuristic-v2". Rewritten to work on REAL Rekognition
// landmarks. The earlier placeholder looked for landmark names Rekognition
// doesn't produce (jawlineLeft, cheekboneLeft, …) and compared widths and
// heights without accounting for the photo's own shape, so on a portrait
// photo its ratios were simply wrong.
//
// What it measures (all in real pixels, so a tall or wide photo doesn't
// distort anything, and using point-to-point distances, so a slightly
// tilted head doesn't either):
//   cheekWidth  upperJawlineLeft ↔ upperJawlineRight  (widest part of the face)
//   jawWidth    midJawlineLeft   ↔ midJawlineRight    (width at the jaw)
//   browWidth   outer end of one eyebrow ↔ outer end of the other (stand-in for forehead width)
//   faceLength  eyebrow line → chinBottom, × 1.5      (the brow-to-chin
//               stretch is about two-thirds of a face; Rekognition gives no
//               hairline point, so the top third is estimated)
//
// and the three ratios the rules below read:
//   lengthToWidth = faceLength / cheekWidth
//   jawToCheek    = jawWidth   / cheekWidth
//   browToCheek   = browWidth  / cheekWidth
//
// STILL A HEURISTIC, NOT THE TRAINED MODEL. The thresholds below are
// reasoned estimates that have not yet been checked against a labelled set
// of faces. Every analysis stores its measurements (see `features`, saved
// into photos.rekognition_raw by /api/analyze) precisely so the thresholds
// can be tuned from real photos, and so the Part H plan still applies:
//   1. Kaggle face-shape dataset + self-labeled Diamond examples
//   2. Run those images through Rekognition, compute these same features
//   3. Train a small classifier (RandomForest / XGBoost, target 75–85%)
//   4. Replace the rules in `classifyFromFeatures` with the trained model
//   5. Pull misclassified real photos back into the training set.

import type { DetectFaceResult, FaceLandmark } from "./integrations/rekognition";

export type FaceShape = "Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Long";

export const CLASSIFIER_VERSION = "heuristic-v2";

export interface ImageSize {
  width: number;
  height: number;
}

export interface FaceFeatures {
  lengthToWidth: number;
  jawToCheek: number | null; // null when Rekognition returned no jawline points
  browToCheek: number | null;
  /** "landmarks" = full measurement; "box" = fell back to the face's bounding box only. */
  method: "landmarks" | "box";
}

export interface ClassifyResult {
  faceShape: FaceShape;
  confidence: number; // 0..100 — how clearly the measurements point to this shape, NOT a trained model's accuracy
  features: FaceFeatures;
  version: string;
}

// --- thresholds (untuned — see header) -------------------------------------
const LONG_MIN_LENGTH = 1.48; // face clearly longer than it is wide
const ROUND_MAX_LENGTH = 1.25; // face about as wide as it is long
const SQUARE_MIN_JAW = 0.92; // jaw nearly as wide as the cheekbones
const NARROW_MAX_JAW = 0.78; // jaw clearly narrower than the cheekbones
const HEART_MIN_BROW = 0.8; // wide forehead over a narrow jaw → Heart; narrow forehead → Diamond

type Point = { x: number; y: number };

function point(landmarks: FaceLandmark[], type: string, size: ImageSize): Point | null {
  const l = landmarks.find((m) => m.type === type);
  return l ? { x: l.x * size.width, y: l.y * size.height } : null;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** How far past a threshold a value is, as a 0..1 "how sure" figure. */
function margin(value: number, threshold: number, span: number): number {
  return Math.max(0, Math.min(1, Math.abs(value - threshold) / span));
}

export function measureFace(detection: DetectFaceResult, imageSize?: ImageSize | null): FaceFeatures {
  // Without the photo's real dimensions we assume it is square. Callers
  // should pass the size (see lib/imageSize.ts) — this is only a fallback.
  const size = imageSize && imageSize.width > 0 && imageSize.height > 0 ? imageSize : { width: 1, height: 1 };
  const lm = detection.landmarks;

  const cheekL = point(lm, "upperJawlineLeft", size);
  const cheekR = point(lm, "upperJawlineRight", size);
  const jawL = point(lm, "midJawlineLeft", size);
  const jawR = point(lm, "midJawlineRight", size);
  const chin = point(lm, "chinBottom", size);
  const browUpL = point(lm, "leftEyeBrowUp", size);
  const browUpR = point(lm, "rightEyeBrowUp", size);
  const browOuterL = point(lm, "leftEyeBrowLeft", size);
  const browOuterR = point(lm, "rightEyeBrowRight", size);

  if (cheekL && cheekR && jawL && jawR && chin && browUpL && browUpR) {
    const cheekWidth = distance(cheekL, cheekR);
    if (cheekWidth > 0) {
      const faceLength = distance(midpoint(browUpL, browUpR), chin) * 1.5;
      return {
        lengthToWidth: round2(faceLength / cheekWidth),
        jawToCheek: round2(distance(jawL, jawR) / cheekWidth),
        browToCheek: browOuterL && browOuterR ? round2(distance(browOuterL, browOuterR) / cheekWidth) : null,
        method: "landmarks",
      };
    }
  }

  // Fallback: only the bounding box is usable (no jawline points came back).
  const boxW = detection.boundingBox.width * size.width;
  const boxH = detection.boundingBox.height * size.height;
  return {
    lengthToWidth: boxW > 0 ? round2(boxH / boxW) : 1.35,
    jawToCheek: null,
    browToCheek: null,
    method: "box",
  };
}

export function classifyFromFeatures(features: FaceFeatures): { faceShape: FaceShape; confidence: number } {
  const { lengthToWidth: L, jawToCheek: J, browToCheek: B } = features;

  if (features.method === "box" || J === null) {
    // Coarse call from the box alone — length vs width is all we have.
    if (L >= LONG_MIN_LENGTH) return { faceShape: "Long", confidence: 52 };
    if (L <= ROUND_MAX_LENGTH) return { faceShape: "Round", confidence: 50 };
    return { faceShape: "Oval", confidence: 50 };
  }

  if (L >= LONG_MIN_LENGTH) {
    return { faceShape: "Long", confidence: 62 + Math.round(18 * margin(L, LONG_MIN_LENGTH, 0.2)) };
  }
  if (J >= SQUARE_MIN_JAW) {
    return { faceShape: "Square", confidence: 60 + Math.round(18 * margin(J, SQUARE_MIN_JAW, 0.1)) };
  }
  if (J < NARROW_MAX_JAW) {
    // Narrow jaw under wider cheekbones: Heart if the forehead is wide too,
    // Diamond if it isn't. Eyebrow width is only a rough stand-in for the
    // forehead, so neither call gets a high confidence.
    const wideForehead = B === null ? true : B >= HEART_MIN_BROW;
    const base = 56 + Math.round(10 * margin(J, NARROW_MAX_JAW, 0.1));
    return { faceShape: wideForehead ? "Heart" : "Diamond", confidence: base };
  }
  if (L <= ROUND_MAX_LENGTH) {
    return { faceShape: "Round", confidence: 60 + Math.round(16 * margin(L, ROUND_MAX_LENGTH, 0.15)) };
  }

  // In between on every measure: the balanced shape. More confident the
  // further it sits from all three edges.
  const centred = Math.min(
    margin(L, LONG_MIN_LENGTH, 0.15),
    margin(L, ROUND_MAX_LENGTH, 0.15),
    margin(J, SQUARE_MIN_JAW, 0.08),
    margin(J, NARROW_MAX_JAW, 0.08)
  );
  return { faceShape: "Oval", confidence: 58 + Math.round(20 * centred) };
}

/**
 * Classify a detected face. Pass the photo's pixel size so widths and
 * heights are compared on the same scale.
 */
export function classifyFaceShape(detection: DetectFaceResult, imageSize?: ImageSize | null): ClassifyResult {
  const features = measureFace(detection, imageSize);
  const result = classifyFromFeatures(features);

  // A head that is turned or tilted foreshortens these measurements, and an
  // unknown photo size means the ratios were taken on a guessed scale.
  let confidence = result.confidence;
  const yaw = Math.abs(detection.pose?.yaw ?? 0);
  const pitch = Math.abs(detection.pose?.pitch ?? 0);
  if (yaw > 10 || pitch > 12) confidence -= 6;
  if (!imageSize) confidence -= 8;

  return {
    faceShape: result.faceShape,
    confidence: Math.max(40, Math.min(85, confidence)),
    features,
    version: CLASSIFIER_VERSION,
  };
}

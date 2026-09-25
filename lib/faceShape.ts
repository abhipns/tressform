// Tressform — face-shape classifier (Part H "our stack": Rekognition
// landmarks in, our own classifier out).
//
// This is a placeholder ratio-based heuristic so /api/analyze has a real
// classify step end-to-end in mock mode. It is NOT the trained model —
// swap this out per the Part H build guide:
//   1. Kaggle face-shape dataset + self-labeled Diamond examples
//   2. Extract the same landmark features from those images (MediaPipe/dlib)
//   3. Compute 5–10 ratio features (jaw width : cheekbone width, face
//      length : face width, forehead width : jaw width, chin angle, etc.)
//   4. Train a scikit-learn RandomForest or XGBoost classifier on those
//      features (target 75–85% accuracy)
//   5. Export the trained model, wire it in wherever `classifyFaceShape`
//      below is called, feeding it live Rekognition landmarks instead of
//      this heuristic
//   6. Keep `rekognition_raw` on the photos table so misclassified photos
//      can be pulled back into the training set later.

import type { DetectFaceResult } from "./integrations/rekognition";

export type FaceShape = "Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Long";

export interface ClassifyResult {
  faceShape: FaceShape;
  confidence: number; // 0..100 — heuristic confidence, not a trained model's
}

function findLandmark(landmarks: DetectFaceResult["landmarks"], type: string) {
  return landmarks.find((l) => l.type === type);
}

/**
 * Placeholder heuristic classifier — see module comment. Uses the face
 * bounding box aspect ratio plus jaw/cheekbone landmark spread as rough
 * proxies until the trained model (Part H) replaces this.
 */
export function classifyFaceShape(detection: DetectFaceResult): ClassifyResult {
  const { boundingBox, landmarks } = detection;
  const aspectRatio = boundingBox.width / boundingBox.height; // wider face -> higher ratio

  const jawLeft = findLandmark(landmarks, "jawlineLeft");
  const jawRight = findLandmark(landmarks, "jawlineRight");
  const cheekLeft = findLandmark(landmarks, "cheekboneLeft");
  const cheekRight = findLandmark(landmarks, "cheekboneRight");

  const jawWidth = jawLeft && jawRight ? Math.abs(jawRight.x - jawLeft.x) : boundingBox.width * 0.75;
  const cheekWidth = cheekLeft && cheekRight ? Math.abs(cheekRight.x - cheekLeft.x) : boundingBox.width * 0.9;
  const jawToCheekRatio = cheekWidth > 0 ? jawWidth / cheekWidth : 1;

  if (aspectRatio > 0.85) {
    return { faceShape: "Round", confidence: 68 };
  }
  if (aspectRatio < 0.68) {
    return { faceShape: "Long", confidence: 66 };
  }
  if (jawToCheekRatio > 0.95) {
    return { faceShape: "Square", confidence: 65 };
  }
  if (jawToCheekRatio < 0.75) {
    return { faceShape: "Heart", confidence: 64 };
  }
  if (cheekWidth > jawWidth * 1.15 && cheekWidth > boundingBox.width * 0.88) {
    return { faceShape: "Diamond", confidence: 62 };
  }
  return { faceShape: "Oval", confidence: 70 };
}

// The safety net on generated previews (11.10.2026, agreed with the owner).
//
// Before a customer sees a preview, it is compared with the photo it was
// made from. Two things must hold:
//   - SAME PERSON. On 11.10.2026 one image model returned eight pictures of
//     a grey-haired man, five of them with another, younger man's face.
//   - SAME POSE. The same day, a firmer instruction made another model turn
//     a front-facing man's head to the side in two pictures out of three.
// A preview that fails is thrown away and made once more; if the second one
// fails too, the customer is told and that preview is not counted against
// them (the routes do that part).
//
// The two limits below are first settings, not measured ones. The owner's
// Studio shows the numbers for every picture it makes and they are saved
// with each result (style_results.check_result), so the limits can be set
// from real pictures: pass ones that look right, fail ones that do not.

import { comparePreview, type PreviewComparison } from "./integrations/rekognition";

/** Below this likeness (0–100) the preview is treated as a different person. */
export const SAME_PERSON_MIN = 85;
/** The head may turn left/right this many degrees from the customer's photo … */
export const YAW_CHANGE_MAX = 15;
/** … and nod up/down this many. */
export const PITCH_CHANGE_MAX = 20;

export type PreviewProblem = "no-face" | "different-person" | "turned";

export interface PreviewVerdict {
  /** true = show it. Also true when the check could not be made: the net never blocks on its own failure. */
  ok: boolean;
  checked: boolean;
  problem: PreviewProblem | null;
  similarity: number | null;
  yawChange: number | null;
  pitchChange: number | null;
  note: string | null;
}

export interface Pose {
  yaw: number;
  pitch: number;
}

/** Read the head pose saved with a photo's analysis (the face service's own capitalised names). */
export function poseFromAnalysis(raw: unknown): Pose | null {
  const pose = (raw as { pose?: { Yaw?: unknown; Pitch?: unknown } } | null)?.pose;
  if (!pose || typeof pose.Yaw !== "number" || typeof pose.Pitch !== "number") return null;
  return { yaw: pose.Yaw, pitch: pose.Pitch };
}

/** Turn the comparison's numbers into a verdict. Pure: no network, so it can be tested. */
export function judgePreview(comparison: PreviewComparison, originalPose: Pose | null): PreviewVerdict {
  const base = { similarity: comparison.similarity, yawChange: null, pitchChange: null, note: comparison.note };
  if (!comparison.checked) return { ...base, ok: true, checked: false, problem: null };
  if (!comparison.faceFound) return { ...base, ok: false, checked: true, problem: "no-face" };

  const round = (v: number) => Math.round(v * 10) / 10;
  const from = originalPose ?? { yaw: 0, pitch: 0 };
  const yawChange = comparison.pose ? round(Math.abs(comparison.pose.yaw - from.yaw)) : null;
  const pitchChange = comparison.pose ? round(Math.abs(comparison.pose.pitch - from.pitch)) : null;

  let problem: PreviewProblem | null = null;
  // A turned head lowers the likeness score too, so pose is judged first:
  // "turned" is the truer description of that picture.
  if ((yawChange !== null && yawChange > YAW_CHANGE_MAX) || (pitchChange !== null && pitchChange > PITCH_CHANGE_MAX)) {
    problem = "turned";
  } else if (comparison.similarity !== null && comparison.similarity < SAME_PERSON_MIN) {
    problem = "different-person";
  }
  return { ok: problem === null, checked: true, problem, similarity: comparison.similarity, yawChange, pitchChange, note: comparison.note };
}

/** Compare a preview with the photo it was made from and judge it. */
export async function checkPreview(
  original: Uint8Array | null,
  preview: Uint8Array,
  originalPose: Pose | null
): Promise<PreviewVerdict> {
  if (!original) {
    return { ok: true, checked: false, problem: null, similarity: null, yawChange: null, pitchChange: null, note: "the customer's photo could not be read back" };
  }
  try {
    return judgePreview(await comparePreview(original, preview), originalPose);
  } catch (err) {
    console.error("[Tressform] Preview check failed:", (err as Error)?.message);
    return { ok: true, checked: false, problem: null, similarity: null, yawChange: null, pitchChange: null, note: "the check itself failed" };
  }
}

/** One short line describing a verdict, for the owner's Studio and the server log. */
export function describeVerdict(v: PreviewVerdict): string {
  if (!v.checked) return `Not checked: ${v.note ?? "unknown reason"}`;
  if (v.problem === "no-face") return "No face found in the picture";
  const likeness = v.similarity === null ? "" : `same person ${Math.round(v.similarity)}%`;
  const turn = v.yawChange === null ? "" : `head turned ${Math.round(v.yawChange)}°`;
  const parts = [likeness, turn].filter(Boolean).join(", ");
  if (v.problem === "turned") return `Fails: head turned (${parts})`;
  if (v.problem === "different-person") return `Fails: does not look like the same person (${parts})`;
  return `Passes: ${parts}`;
}

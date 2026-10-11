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
// THE LIMITS, AND WHERE THEY COME FROM. On 11.10.2026 the check was run over
// the 85 pictures the owner had made in two days of choosing an image model
// (the numbers are saved with each: style_results.check_result). They fell
// into groups with wide gaps between them:
//
//   likeness   the 6 pictures everyone agreed showed another man's face
//              scored 2.7 to 37.1; every other picture scored 99 or more.
//   head turn  77 pictures were within 2.6° of the customer's photo. The
//              two with a visibly turned head were 13.1° and 30° away.
//   nodding    never more than 5.1° in any picture.
//
// Each limit sits inside its gap. With them, all 6 wrong faces and both
// turned heads fail, and all 77 good pictures pass. (The first guesses were
// 85, 15° and 20°; 15° would have let the 13.1° turned head through.)
//
// What this check cannot see: a face that is the same person but smoother,
// fairer or slightly reshaped still scores 100, and it knows nothing about
// whether the haircut itself is right.

import { comparePreview, type PreviewComparison } from "./integrations/rekognition";

/** Below this likeness (0–100) the preview is treated as a different person. */
export const SAME_PERSON_MIN = 90;
/** The head may turn left/right this many degrees from the customer's photo … */
export const YAW_CHANGE_MAX = 8;
/** … and nod up/down this many. */
export const PITCH_CHANGE_MAX = 12;

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

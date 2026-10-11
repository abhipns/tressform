import { describe, expect, it } from "vitest";
import { describeVerdict, judgePreview, poseFromAnalysis } from "../lib/previewCheck";

const comparison = (over: Record<string, unknown> = {}) => ({
  checked: true,
  note: null,
  faceFound: true,
  similarity: 99.2,
  pose: { roll: 0, yaw: 1, pitch: 5 },
  ...over,
});

describe("judgePreview", () => {
  it("passes the same person in the same pose", () => {
    const v = judgePreview(comparison(), { yaw: 0.3, pitch: 8.3 });
    expect(v.ok).toBe(true);
    expect(v.problem).toBeNull();
    expect(describeVerdict(v)).toBe("Passes: same person 99%, head turned 1°");
  });

  it("fails a turned head, even when the face still matches", () => {
    const v = judgePreview(comparison({ pose: { roll: 0, yaw: -31, pitch: 4 } }), { yaw: 0.3, pitch: 8.3 });
    expect(v.ok).toBe(false);
    expect(v.problem).toBe("turned");
    expect(v.yawChange).toBeCloseTo(31.3, 1);
  });

  it("measures the turn from the customer's own photo, not from zero", () => {
    // A customer whose photo is already turned 12° is not failed for a preview turned 14°.
    expect(judgePreview(comparison({ pose: { roll: 0, yaw: 14, pitch: 0 } }), { yaw: 12, pitch: 0 }).ok).toBe(true);
    expect(judgePreview(comparison({ pose: { roll: 0, yaw: 6, pitch: 0 } }), null).ok).toBe(true);
    expect(judgePreview(comparison({ pose: { roll: 0, yaw: 14, pitch: 0 } }), null).problem).toBe("turned");
  });

  it("agrees with the owner's real pictures of 11.10.2026", () => {
    const straight = { yaw: 0.3, pitch: 8.3 };
    // The two turned heads (13.1° and 30° from the photo) fail …
    expect(judgePreview(comparison({ similarity: 100, pose: { roll: 0, yaw: 13.4, pitch: 3.2 } }), straight).problem).toBe("turned");
    expect(judgePreview(comparison({ similarity: 100, pose: { roll: 0, yaw: 30.3, pitch: 0.4 } }), straight).problem).toBe("turned");
    // … the most-moved good picture (2.6°) passes …
    expect(judgePreview(comparison({ similarity: 100, pose: { roll: 0, yaw: 2.9, pitch: 8 } }), straight).ok).toBe(true);
    // … the best-scoring wrong face (37.1) fails and the worst-scoring right one (99) passes.
    expect(judgePreview(comparison({ similarity: 37.1 }), straight).problem).toBe("different-person");
    expect(judgePreview(comparison({ similarity: 99 }), straight).ok).toBe(true);
  });

  it("fails a different person", () => {
    const v = judgePreview(comparison({ similarity: 61.4 }), { yaw: 0, pitch: 0 });
    expect(v.problem).toBe("different-person");
    expect(describeVerdict(v)).toContain("does not look like the same person");
  });

  it("fails a picture with no face", () => {
    expect(judgePreview(comparison({ faceFound: false, similarity: null, pose: null }), null).problem).toBe("no-face");
  });

  it("never blocks a picture because the check could not run", () => {
    const v = judgePreview(comparison({ checked: false, note: "permission missing", similarity: null, pose: null }), null);
    expect(v.ok).toBe(true);
    expect(v.checked).toBe(false);
    expect(describeVerdict(v)).toBe("Not checked: permission missing");
  });
});

describe("poseFromAnalysis", () => {
  it("reads the saved pose and tolerates its absence", () => {
    expect(poseFromAnalysis({ pose: { Yaw: 0.97, Pitch: 17.6, Roll: 2.1 } })).toEqual({ yaw: 0.97, pitch: 17.6 });
    expect(poseFromAnalysis({})).toBeNull();
    expect(poseFromAnalysis(null)).toBeNull();
  });
});

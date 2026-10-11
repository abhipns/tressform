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
    expect(judgePreview(comparison({ pose: { roll: 0, yaw: 14, pitch: 0 } }), null).ok).toBe(true);
    expect(judgePreview(comparison({ pose: { roll: 0, yaw: 18, pitch: 0 } }), null).problem).toBe("turned");
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

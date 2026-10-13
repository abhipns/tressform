import { describe, expect, it } from "vitest";
import { tooClose } from "../lib/photoFraming";

describe("tooClose", () => {
  it("accepts a head-and-shoulders selfie", () => {
    expect(tooClose({ top: 0.22, height: 0.35 })).toBe(false);
    expect(tooClose({ top: 0.2, height: 0.5 })).toBe(false); // the demo face box
  });
  it("asks for a step back when the face fills the photo", () => {
    expect(tooClose({ top: 0.1, height: 0.6 })).toBe(true);
  });
  it("asks for a step back when the chin is near the bottom edge", () => {
    expect(tooClose({ top: 0.4, height: 0.45 })).toBe(true);
  });
  it("ignores a missing face box", () => {
    expect(tooClose({ top: 0, height: 0 })).toBe(false);
  });
});

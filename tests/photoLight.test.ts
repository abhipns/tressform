import { describe, expect, it } from "vitest";
import { GUIDE_OVAL, readLight } from "../lib/photoLight";

const W = 60;
const H = 80;

/**
 * Draw a simple picture: a background, and a face inside the guide outline
 * whose skin is `skin` bright with highlights of `highlight` down its
 * middle. `leftFactor` darkens the left half of everything.
 */
function picture({ background, skin, highlight, leftFactor = 1 }: { background: number; skin: number; highlight: number; leftFactor?: number }) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = ((x + 0.5) / W - GUIDE_OVAL.cx) / GUIDE_OVAL.rx;
      const dy = ((y + 0.5) / H - GUIDE_OVAL.cy) / GUIDE_OVAL.ry;
      const inFace = dx * dx + dy * dy <= 1;
      let v = inFace ? (Math.abs(dx) < 0.25 ? highlight : skin) : background;
      if (x < W / 2) v *= leftFactor;
      const i = (y * W + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  return data;
}

const read = (p: Parameters<typeof picture>[0], face = true, sides = true) =>
  readLight(picture(p), W, H, face ? GUIDE_OVAL : null, { sides });

describe("readLight", () => {
  it("passes a well-lit face, light skin or dark", () => {
    expect(read({ background: 200, skin: 170, highlight: 215 }).problem).toBeNull();
    // Dark skin in good light: low on average, but with clear highlights.
    expect(read({ background: 210, skin: 62, highlight: 128 }).problem).toBeNull();
  });

  it("says a dark room is too dark", () => {
    const r = read({ background: 40, skin: 35, highlight: 55 });
    expect(r.problem).toBe("dark");
    expect(r.message).toContain("too dark");
  });

  it("says the light is behind when the face is dark and the surroundings are bright", () => {
    expect(read({ background: 245, skin: 45, highlight: 70 }).problem).toBe("backlit");
  });

  it("says one side is in shadow when one cheek is far darker than the other", () => {
    expect(read({ background: 190, skin: 160, highlight: 200, leftFactor: 0.35 }).problem).toBe("uneven");
    // A small difference between the sides is normal and passes.
    expect(read({ background: 190, skin: 160, highlight: 200, leftFactor: 0.7 }).problem).toBeNull();
  });

  it("does not judge the two sides on a side-on photo", () => {
    expect(read({ background: 190, skin: 160, highlight: 200, leftFactor: 0.35 }, true, false).problem).toBeNull();
  });

  it("says there is too much light when the face is burnt out", () => {
    expect(read({ background: 255, skin: 255, highlight: 255 }).problem).toBe("glare");
  });

  it("with no face outline, only refuses a picture that is dark all over", () => {
    expect(read({ background: 30, skin: 30, highlight: 45 }, false).problem).toBe("dark");
    expect(read({ background: 245, skin: 45, highlight: 70 }, false).problem).toBeNull();
    expect(read({ background: 200, skin: 170, highlight: 215 }, false).problem).toBeNull();
  });
});

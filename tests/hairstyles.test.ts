import { describe, expect, it } from "vitest";
import { HAIRSTYLES, frontDescription } from "../lib/content/hairstyles";
import { STUDIO_STYLES } from "../lib/content/studioStyles";
import { describeStyle } from "../lib/integrations/falai";

// Words that ask the image model to show the back of the head. "swept
// back", "straight back" and "slightly back" are directions the hair is
// combed in, so "back" is only caught where it names a part of the head.
const BACK_OF_HEAD = /\b(nape|neckline|collar)\b|\bsides and back\b|\bback and sides\b|\bat the back\b|\bthe back of\b|\bears? (fully )?(visible|showing)\b/i;

describe("front-view descriptions", () => {
  it("never ask for the back of the head, the nape or the neckline", () => {
    for (const style of HAIRSTYLES) {
      expect(frontDescription(style), style.name).not.toMatch(BACK_OF_HEAD);
    }
  });

  it("are what the Studio sends for all 61 styles", () => {
    const all = [...STUDIO_STYLES.men, ...STUDIO_STYLES.women];
    expect(all).toHaveLength(61);
    for (const studio of all) expect(studio.prompt, studio.label).not.toMatch(BACK_OF_HEAD);
  });

  it("are what today's three customer styles use too", () => {
    for (const name of ["Textured Quiff — Low Taper", "Classic Crop — Mid Fade", "Curl Definition Crop"]) {
      expect(describeStyle(name), name).not.toMatch(BACK_OF_HEAD);
    }
  });

  it("leave the full description, with the back, in place for the barber card", () => {
    const sidePart = HAIRSTYLES.find((s) => s.id === "m-side-part")!;
    expect(sidePart.prompt).toContain("neckline");
    expect(sidePart.front).not.toContain("neckline");
  });
});

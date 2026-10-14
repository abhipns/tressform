import { describe, expect, it } from "vitest";
import { HAIRSTYLES, hairstyleById, LENGTH_NOW } from "../lib/content/hairstyles";
import { canCutToday, pickStyles } from "../lib/recommend";
import { buildEditPrompt, buildKontextPrompt } from "../lib/integrations/falai";

// 14.10.2026: men's "medium" split into 5–7 and 7–10 cm, and the image
// model told the customer's present length as the limit for a cut today.

const TOP_CM: Record<string, number> = { "very-short": 2, short: 5, medium: 7, "medium-long": 10 };

describe("men's lengths", () => {
  it("no men's style asks for more hair on top than its length class gives", () => {
    for (const style of HAIRSTYLES.filter((s) => s.gender === "men" && s.needs !== "long")) {
      const range = (style.front ?? style.prompt).match(/(\d+(?:\.\d+)?)(?:[–-](\d+(?:\.\d+)?))?\s*cm/);
      if (!range) continue;
      const shortest = Number(range[1]);
      expect(shortest, `${style.id} starts at ${shortest} cm`).toBeLessThanOrEqual(TOP_CM[style.needs]);
    }
  });

  it("an 8–10 cm cut is ready today at 7–10 cm, but needs growing at 5–7 cm", () => {
    const twoBlock = hairstyleById("m-two-block")!;
    expect(canCutToday("men", "medium-long", twoBlock)).toBe(true);
    expect(canCutToday("men", "medium", twoBlock)).toBe(false);
    expect(canCutToday("men", "long", twoBlock)).toBe(true);
  });

  it("at 5–7 cm the picks ready today are all 5–7 cm cuts or shorter", () => {
    const picks = pickStyles({ gender: "men", faceShape: "Oval", texture: "straight", length: "medium" });
    for (const pick of picks.top) {
      expect(pick.cutToday).toBe(true);
      expect(["very-short", "short", "medium"]).toContain(pick.style.needs);
    }
  });

  it("a style for the other gender is never 'ready today'", () => {
    expect(canCutToday("women", "shoulder", hairstyleById("m-two-block")!)).toBe(false);
  });
});

describe("the image model is told the present length", () => {
  const base = { sourceImageUrl: "x", styleName: "Two-block", styleDescription: "a two-block cut, 8–10 cm on top" };
  it("as a limit, for a cut made today", () => {
    for (const build of [buildEditPrompt, buildKontextPrompt]) {
      const prompt = build({ ...base, lengthNow: LENGTH_NOW["medium-long"] });
      expect(prompt).toContain("about 7 to 10 cm long now");
      expect(prompt).toContain("must not be longer or thicker anywhere");
      expect(prompt).toContain("Never add hair.");
    }
  });
  it("not at all when there is nothing to limit", () => {
    expect(buildEditPrompt(base)).not.toContain("Never add hair.");
    expect(buildKontextPrompt({ ...base, lengthNow: null })).not.toContain("Never add hair.");
  });
});

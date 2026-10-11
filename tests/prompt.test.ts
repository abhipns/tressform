// What the image model is told about facial hair.
//
// Twice now a preview has come back with a beard the person does not have:
// once on a clean-shaven man, once as a full beard on a man with a goatee.
// Both times the instruction had named a beard without saying where it
// stops. These keep that wording from coming back.

import { describe, expect, it } from "vitest";
import { buildEditPrompt, buildKontextPrompt } from "../lib/integrations/falai";

const base = { sourceImageUrl: "https://example.com/p.jpg", styleName: "Crew cut" };

describe("the facial hair instruction", () => {
  it("never tells the model to keep a 'beard', which invites a fuller one", () => {
    for (const build of [buildEditPrompt, buildKontextPrompt]) {
      const prompt = build({ ...base, facialHair: "beard" });
      expect(prompt).not.toMatch(/keep their beard/i);
      expect(prompt).toMatch(/exactly as it is in the photo/);
      expect(prompt).toMatch(/do not grow, thicken, extend or join up/);
      expect(prompt).toMatch(/cheeks, jaw or neck/);
    }
  });

  it("keeps a clean-shaven face clean-shaven", () => {
    expect(buildEditPrompt({ ...base, facialHair: "clean" })).toMatch(/keep the face clean-shaven/);
  });

  it("does not let a moustache become a beard", () => {
    expect(buildEditPrompt({ ...base, facialHair: "moustache" })).toMatch(/do not add a beard or stubble/);
  });

  it("forbids growing facial hair when nothing is known about it", () => {
    expect(buildEditPrompt({ ...base, facialHair: null })).toMatch(/do not add, remove, grow, thicken or reshape/);
  });

  it("asks for a neat finish on the hair of the head only", () => {
    expect(buildEditPrompt({ ...base, facialHair: "beard" })).toMatch(/the hair on their head looking neatly styled/);
  });

  it("does not let a haircut fill in a receding hairline", () => {
    expect(buildEditPrompt({ ...base, facialHair: "beard" })).toMatch(/do not fill in a receding hairline or thinning areas/);
  });
});

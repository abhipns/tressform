import { describe, expect, it } from "vitest";
import { buildEditPrompt, buildKontextPrompt } from "../lib/integrations/falai";

const base = { sourceImageUrl: "x", styleName: "Classic Crop — Mid Fade" };

describe("Studio test looks (13.10.2026)", () => {
  it("leaves the customer instruction unchanged when the options are off", () => {
    const p = buildEditPrompt(base);
    expect(p).toContain("camera angle, clothing and background.");
    expect(p).not.toContain("light-grey");
    expect(buildKontextPrompt(base)).toContain("Keep the clothing, background, lighting, camera angle");
  });
  it("asks for a soft light-grey backdrop and stops asking to keep the background", () => {
    const p = buildEditPrompt({ ...base, greyBackground: true, polish: false });
    expect(p).toContain("soft light-grey studio backdrop");
    expect(p).not.toContain("background, framing");
    expect(buildKontextPrompt({ ...base, greyBackground: true })).not.toContain("clothing, background,");
  });
  it("asks for even light while keeping the skin tone", () => {
    const p = buildEditPrompt({ ...base, evenLight: true, polish: false });
    expect(p).toContain("Keep their skin tone exactly as it is in the photo");
    expect(p).not.toContain("relight");
  });
});

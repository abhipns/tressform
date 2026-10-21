import { describe, expect, it } from "vitest";
import { HAIRSTYLES } from "../lib/content/hairstyles";
import { matchScore, specialitiesForStyle, styleMatchFor } from "../lib/salonMatch";

describe("style match (first version)", () => {
  it("finds what a cut needs from its description", () => {
    expect(styleMatchFor("m-french-crop")!.specialities).toEqual(expect.arrayContaining(["TAPER", "CREATIVE_TRENDING"]));
    expect(styleMatchFor("m-curly-top")!.specialities).toEqual(expect.arrayContaining(["CURLY_HAIR", "FADE", "TAPER"]));
    expect(styleMatchFor("w-french-bob")!.specialities).toEqual(expect.arrayContaining(["BOB", "SHORT_WOMENS_HAIR"]));
    expect(styleMatchFor("w-long-layers")!.specialities).toEqual(expect.arrayContaining(["LAYERED_HAIR", "LONG_HAIR"]));
  });
  it("men's styles go to salons for men or unisex, women's to women or unisex", () => {
    expect(styleMatchFor("m-buzz-cut")!.customerTypes).toEqual(["MEN", "UNISEX"]);
    expect(styleMatchFor("w-pixie")!.customerTypes).toEqual(["WOMEN", "UNISEX"]);
  });
  it("gives most styles at least one speciality, and scores overlap", () => {
    const none = HAIRSTYLES.filter((s) => specialitiesForStyle(s).length === 0).map((s) => s.id);
    expect(none.length).toBeLessThanOrEqual(12);
    expect(matchScore(["FADE", "TAPER", "BOB"], ["TAPER", "CURLY_HAIR"])).toBe(1);
  });
  it("unknown style → no match", () => {
    expect(styleMatchFor("nope")).toBeNull();
  });
});

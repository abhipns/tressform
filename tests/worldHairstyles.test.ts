import { describe, expect, it } from "vitest";
import {
  MODELS,
  REGION_LABEL,
  WORLD_REGIONS,
  WORLD_STYLES,
  imagePrompt,
  modelPrompt,
  showingLine,
  tryLink,
  worldStyleBySlug,
  worldStyleId,
} from "../lib/content/worldHairstyles";
import { HAIRSTYLES, barberPoints, frontDescription, hairstyleById } from "../lib/content/hairstyles";
import { pickStyles, worldStyleFits } from "../lib/recommend";
import { priceForPictures } from "../lib/pricing";
import { careFor } from "../lib/content/haircare";

const FACES = ["Oval", "Round", "Square", "Heart", "Diamond", "Long"];

describe("Hairstyles of the World — the list (26.10.2026)", () => {
  it("has 100 styles, half men's and half women's", () => {
    expect(WORLD_STYLES.length).toBe(100);
    expect(WORLD_STYLES.filter((s) => s.gender === "men").length).toBe(50);
  });

  it("covers every region, for men and for women", () => {
    for (const region of WORLD_REGIONS) {
      for (const gender of ["men", "women"] as const) {
        expect(WORLD_STYLES.some((s) => s.region === region && s.gender === gender), `${region} ${gender}`).toBe(true);
      }
    }
  });

  it("has unique, address-safe slugs and every field filled in", () => {
    expect(new Set(WORLD_STYLES.map((s) => s.slug)).size).toBe(WORLD_STYLES.length);
    for (const s of WORLD_STYLES) {
      expect(s.slug, s.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(s.code, s.slug).toMatch(/^[A-Z]{2}$/);
      expect(s.country.length, s.slug).toBeGreaterThan(2);
      expect(s.line.length, s.slug).toBeGreaterThan(20);
      expect(s.cut.length, s.slug).toBeGreaterThan(40);
      expect(s.best.length, s.slug).toBeGreaterThanOrEqual(2);
      s.best.forEach((f) => expect(FACES).toContain(f));
      s.avoid.forEach((f) => expect(s.best).not.toContain(f));
      expect(s.texture.some((t) => t > 0), s.slug).toBe(true);
      expect(s.effects.length, s.slug).toBeGreaterThan(0);
      expect(s.barber.length, s.slug).toBeGreaterThanOrEqual(2);
      expect(s.barber.some((p) => p.startsWith("Best for: ")), s.slug).toBe(true);
    }
  });

  it("names no celebrity or lookalike in a style or a model", () => {
    const text = [...WORLD_STYLES.flatMap((s) => [s.name, s.line, s.cut, ...s.barber]), ...WORLD_REGIONS.flatMap((r) => Object.values(MODELS[r]))].join(" ");
    expect(text).not.toMatch(/lookalike|look-alike|celebrity|famous|inspired by|\bas worn by\b/i);
  });

  it("has a region-matched model for each region and gender, used in the image prompts", () => {
    for (const region of WORLD_REGIONS) {
      for (const gender of ["men", "women"] as const) {
        expect(MODELS[region][gender].length).toBeGreaterThan(20);
        expect(modelPrompt(region, gender)).toContain(MODELS[region][gender]);
      }
    }
    const korean = worldStyleBySlug("comma-hair")!;
    expect(imagePrompt(korean)).toContain("Korean man");
    expect(imagePrompt(korean)).toContain(korean.cut);
    expect(imagePrompt(korean)).toMatch(/light-grey/);
  });

  it("says what is showing", () => {
    expect(showingLine(12, "men", "europe")).toBe("Showing 12 men's styles from Europe");
    expect(showingLine(1, "women", "all")).toBe("Showing 1 women's style from around the world");
    expect(REGION_LABEL["middle-east"]).toBe("Middle East");
  });
});

describe("trying a world style on your own face", () => {
  it("every style can be named by id, priced and bought as single pictures", () => {
    for (const s of WORLD_STYLES) {
      const style = hairstyleById(worldStyleId(s.slug));
      expect(style, s.slug).not.toBeNull();
      expect(frontDescription(style!)).toBe(s.cut);
      expect(barberPoints(style!)).toEqual(s.barber);
      expect(style!.world?.slug).toBe(s.slug);
      // the hair-care tips work for it too
      expect(careFor(style!, "straight").tips).toHaveLength(3);
    }
    expect(priceForPictures(["front", "left", "right", "back"])).toMatchObject({ ok: true, pricePaise: 7000 });
    expect(tryLink("world-comma-hair", "all")).toBe("/?style=world-comma-hair&buy=all#upload");
  });

  it("keeps Tressform's own two lists unchanged", () => {
    expect(HAIRSTYLES.some((s) => s.id.startsWith("world-"))).toBe(false);
  });
});

describe("the automatic picker and world styles", () => {
  it("offers a world style only when it truly fits", () => {
    const comma = hairstyleById("world-comma-hair")!; // best for long and oval faces; straight or wavy hair; needs medium
    expect(worldStyleFits(comma, { gender: "men", faceShape: "Long", texture: "straight", length: "medium" })).toBe(true);
    expect(worldStyleFits(comma, { gender: "men", faceShape: "Round", texture: "straight", length: "medium" })).toBe(false);
    expect(worldStyleFits(comma, { gender: "men", faceShape: "Long", texture: "curly", length: "medium" })).toBe(false);
    expect(worldStyleFits(comma, { gender: "men", faceShape: "Long", texture: "straight", length: "short" })).toBe(false);
    expect(worldStyleFits(comma, { gender: "women", faceShape: "Long", texture: "straight", length: "shoulder" })).toBe(false);
  });

  it("puts at most one world style in a full top 5, and none in the longer list", () => {
    for (const gender of ["men", "women"] as const) {
      const lengths = gender === "men" ? (["short", "medium", "long"] as const) : (["chin", "shoulder", "waist"] as const);
      for (const faceShape of FACES as ("Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Long")[]) {
        for (const texture of ["straight", "wavy", "curly"] as const) {
          for (const length of lengths) {
            const { top, more } = pickStyles({ gender, faceShape, texture, length });
            const world = top.filter((p) => p.style.world);
            // More than one only when Tressform's own cuts couldn't fill the five.
            if (world.length > 1) expect(top.length - world.length, `${gender} ${faceShape} ${texture} ${length}`).toBeLessThan(4);
            expect(more.some((p) => p.style.world)).toBe(false);
            for (const p of world) expect(worldStyleFits(p.style, { gender, faceShape, texture, length })).toBe(true);
          }
        }
      }
    }
  });
});

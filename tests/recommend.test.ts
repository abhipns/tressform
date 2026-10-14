import { describe, expect, it } from "vitest";
import { HAIRSTYLES, MEN_LENGTHS, WOMEN_LENGTHS, hairstylesFor } from "../lib/content/hairstyles";
import { pickStyles, type CustomerHair } from "../lib/recommend";

const SHAPES = ["Oval", "Round", "Square", "Heart", "Diamond", "Long"] as const;
const TEXTURES = ["straight", "wavy", "curly"] as const;

function everyCustomer(): CustomerHair[] {
  const all: CustomerHair[] = [];
  for (const faceShape of SHAPES)
    for (const texture of TEXTURES) {
      for (const length of MEN_LENGTHS) all.push({ gender: "men", faceShape, texture, length });
      for (const length of WOMEN_LENGTHS) all.push({ gender: "women", faceShape, texture, length });
    }
  return all;
}

describe("the hairstyle lists", () => {
  it("has 30 men's and 30 women's styles with unique ids and names", () => {
    expect(hairstylesFor("men")).toHaveLength(30);
    expect(hairstylesFor("women")).toHaveLength(30);
    expect(new Set(HAIRSTYLES.map((s) => s.id)).size).toBe(60);
    expect(new Set(HAIRSTYLES.map((s) => `${s.gender}:${s.name}`)).size).toBe(60);
  });
  it("never lists a face shape as both best and avoid, and every style suits some hair type", () => {
    for (const style of HAIRSTYLES) {
      expect(style.best.filter((shape) => style.avoid.includes(shape)), style.name).toEqual([]);
      expect(style.best.length, style.name).toBeGreaterThan(0);
      expect(Math.max(...style.texture), style.name).toBe(2);
      expect(style.prompt.length, style.name).toBeGreaterThan(40);
    }
  });
});

describe("pickStyles", () => {
  it("only ever puts cuts possible today in the top 5, for every kind of customer", () => {
    for (const customer of everyCustomer()) {
      const { top } = pickStyles(customer);
      expect(top.length).toBeLessThanOrEqual(5);
      for (const pick of top) {
        expect(pick.cutToday, `${JSON.stringify(customer)} → ${pick.style.name}`).toBe(true);
        expect(pick.monthsToGrow).toBeNull();
        expect(pick.style.avoid).not.toContain(customer.faceShape);
        expect(pick.score).toBeLessThanOrEqual(98);
      }
    }
  });

  it("fills the top 5 whenever 5 suitable cuts exist", () => {
    for (const customer of everyCustomer()) {
      const { top, cutsPossibleToday } = pickStyles(customer);
      expect(top.length, JSON.stringify(customer)).toBe(Math.min(5, cutsPossibleToday));
    }
  });

  it("orders best match first and never repeats a style", () => {
    for (const customer of everyCustomer()) {
      const { top, more } = pickStyles(customer);
      const ids = [...top, ...more].map((p) => p.style.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (let i = 1; i < top.length; i++) expect(top[i - 1].score).toBeGreaterThanOrEqual(top[i].score);
    }
  });

  it("never offers straight-hair-only styles to curly hair or curly styles to straight hair", () => {
    const curly = pickStyles({ gender: "men", faceShape: "Oval", texture: "curly", length: "medium" });
    expect([...curly.top, ...curly.more].map((p) => p.style.id)).not.toContain("m-slick-back-undercut");
    const straight = pickStyles({ gender: "men", faceShape: "Oval", texture: "straight", length: "medium" });
    expect([...straight.top, ...straight.more].some((p) => p.style.family === "curly")).toBe(false);
  });

  it("shows a short-haired man no style he would have to grow into in the top 5, but may after", () => {
    const { top, more } = pickStyles({ gender: "men", faceShape: "Oval", texture: "straight", length: "short" });
    expect(top.every((p) => ["very-short", "short"].includes(p.style.needs))).toBe(true);
    const growing = more.filter((p) => !p.cutToday);
    for (const pick of growing) expect(pick.monthsToGrow).toBeGreaterThan(0);
  });

  it("keeps a long-haired woman's top 5 to at most 2 big changes and 1 back-shape cut", () => {
    for (const faceShape of SHAPES)
      for (const texture of TEXTURES)
        for (const length of ["below-shoulder", "mid-back", "waist"] as const) {
          const { top } = pickStyles({ gender: "women", faceShape, texture, length });
          expect(top).toHaveLength(5);
          expect(top.filter((p) => p.bigChange).length, `${faceShape} ${texture} ${length}`).toBeLessThanOrEqual(2);
          expect(top.filter((p) => p.style.family === "back-shape").length).toBeLessThanOrEqual(1);
        }
  });

  it("gives a long-haired woman at least 3 cuts that keep her length and at least 1 clearly shorter one", () => {
    for (const faceShape of SHAPES)
      for (const texture of TEXTURES)
        for (const length of ["below-shoulder", "mid-back", "waist"] as const) {
          const { top } = pickStyles({ gender: "women", faceShape, texture, length });
          const label = `${faceShape} ${texture} ${length}`;
          expect(top.filter((p) => p.stepsShorter <= 1).length, label).toBeGreaterThanOrEqual(3);
          expect(top.filter((p) => p.stepsShorter >= 1).length, label).toBeGreaterThanOrEqual(1);
        }
  });

  it("leaves out styles to avoid for the second guess when the face reading is unsure", () => {
    const sure = pickStyles({ gender: "women", faceShape: "Oval", texture: "straight", length: "chin" });
    const unsure = pickStyles({ gender: "women", faceShape: "Oval", secondFaceShape: "Round", texture: "straight", length: "chin" });
    expect([...sure.top, ...sure.more].map((p) => p.style.id)).toContain("w-blunt-bob");
    expect([...unsure.top, ...unsure.more].map((p) => p.style.id)).not.toContain("w-blunt-bob");
  });

  it("rejects a women's length for a man", () => {
    expect(() => pickStyles({ gender: "men", faceShape: "Oval", texture: "straight", length: "waist" })).toThrow();
  });
});

// 13.10.2026: the Short / Medium / Long filter.
import { lengthBand as bandOf } from "../lib/recommend";
describe("length filter", () => {
  it("shows only cuts of the chosen length", () => {
    for (const band of ["short", "medium", "long"] as const) {
      const { top, more } = pickStyles({ gender: "men", faceShape: "Oval", texture: "straight", length: "long" }, band);
      for (const p of [...top, ...more]) expect(bandOf(p.style)).toBe(band);
      expect(top.length + more.length).toBeGreaterThan(0);
    }
  });
  it("a short-haired man asking for long cuts gets cuts to grow into, not today's cuts", () => {
    const { top, more } = pickStyles({ gender: "men", faceShape: "Oval", texture: "straight", length: "short" }, "long");
    expect(top).toHaveLength(0);
    expect(more.every((p) => !p.cutToday)).toBe(true);
  });
  it("works for women's lengths", () => {
    const { top } = pickStyles({ gender: "women", faceShape: "Oval", texture: "straight", length: "mid-back" }, "short");
    expect(top.length).toBeGreaterThan(0);
    for (const p of top) expect(["ear", "chin"]).toContain(p.style.needs);
  });
  it("leaves the list unchanged with no filter", () => {
    const c = { gender: "men" as const, faceShape: "Oval" as const, texture: "straight" as const, length: "medium" as const };
    expect(pickStyles(c, null)).toEqual(pickStyles(c));
  });
});

import { beardAdjustment } from "../lib/recommend";
import { hairstyleById } from "../lib/content/hairstyles";

describe("beard factor (men)", () => {
  const style = (id: string) => hairstyleById(id)!;
  const man = (faceShape: CustomerHair["faceShape"], facialHair: CustomerHair["facialHair"]): CustomerHair => ({
    gender: "men",
    faceShape,
    texture: "wavy",
    length: "medium",
    facialHair,
  });

  it("long face + beard: height on top goes down, a fringe goes up", () => {
    expect(beardAdjustment(style("m-pompadour"), man("Long", "beard")).points).toBe(-6);
    const fringe = beardAdjustment(style("m-messy-fringe"), man("Long", "beard"));
    expect(fringe.points).toBe(4);
    expect(fringe.reason).toMatch(/beard/);
  });
  it("round face + beard: height on top goes up", () => {
    expect(beardAdjustment(style("m-pompadour"), man("Round", "beard")).points).toBe(4);
  });
  it("neat, short cuts go up with a beard on any face", () => {
    expect(beardAdjustment(style("m-crew-cut"), man("Oval", "beard")).points).toBe(3);
  });
  it("stubble counts half, and says stubble", () => {
    const r = beardAdjustment(style("m-crew-cut"), man("Oval", "stubble"));
    expect(r.points).toBe(2);
    expect(r.reason).toMatch(/stubble/);
  });
  it("no change when clean-shaven, moustache only, unknown, or for women", () => {
    for (const fh of ["clean", "moustache", null] as const) expect(beardAdjustment(style("m-pompadour"), man("Long", fh)).points).toBe(0);
    const woman: CustomerHair = { gender: "women", faceShape: "Long", texture: "wavy", length: "waist", facialHair: "beard" };
    expect(beardAdjustment(style("m-pompadour"), woman).points).toBe(0);
  });
  it("a long-faced man with a beard sees fewer height-on-top cuts at the top of his list", () => {
    const heights = (c: CustomerHair) => pickStyles(c).top.filter((p) => p.style.effects.includes("height")).length;
    expect(heights(man("Long", "beard"))).toBeLessThanOrEqual(heights(man("Long", "clean")));
  });
});

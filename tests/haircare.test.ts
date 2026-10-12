import { describe, expect, it } from "vitest";
import { HAIRSTYLES } from "../lib/content/hairstyles";
import { careFor, finishFor, productsFor, KINDS, type CareProduct } from "../lib/content/haircare";

const TEXTURES = ["straight", "wavy", "curly"] as const;

describe("hair care on the cards", () => {
  it("gives every offered style three tips and known product kinds", () => {
    for (const style of HAIRSTYLES) {
      TEXTURES.forEach((t, i) => {
        if (style.texture[i] === 0) return;
        const care = careFor(style, t);
        expect(care.tips).toHaveLength(3);
        care.tips.forEach((tip) => expect(tip.length).toBeGreaterThan(20));
        care.kinds.forEach((k) => expect(KINDS[k]).toBeDefined());
        expect(care.kinds.length).toBeGreaterThanOrEqual(style.family === "clipper" ? 1 : 2);
      });
    }
  });

  it("knows the finish of every family (no silent default)", () => {
    for (const style of HAIRSTYLES) {
      expect(["none", "matte-clay", "pomade", "wax", "styling-cream", "curl-cream", "serum", "texture-spray"]).toContain(
        finishFor(style, "straight")
      );
    }
  });

  it("puts curl cream on curly hair, and no styling product on a buzz cut", () => {
    const curly = HAIRSTYLES.find((s) => s.id === "m-curly-top")!;
    expect(careFor(curly, "curly").kinds).toContain("curl-cream");
    const buzz = HAIRSTYLES.find((s) => s.id === "m-buzz-cut")!;
    expect(careFor(buzz, "straight").kinds).toEqual(["shampoo-mild"]);
  });

  it("picks matching products, one per kind, and respects gender and hair type", () => {
    const p = (id: string, kind: CareProduct["kind"], extra: Partial<CareProduct> = {}): CareProduct => ({
      id, title: id, brand: null, kind, store: "Amazon", gender: "all", hairTypes: [], note: null, ...extra,
    });
    const products = [
      p("sf", "shampoo-sulphate-free", { hairTypes: ["curly"] }),
      p("mild", "shampoo-mild"),
      p("clay-w", "matte-clay", { gender: "women" }),
      p("clay", "matte-clay"),
      p("cond", "conditioner"),
      p("curl", "curl-cream"),
    ];
    const crop = HAIRSTYLES.find((s) => s.id === "m-textured-crop")!;
    expect(productsFor(products, crop, "straight").map((x) => x.id)).toEqual(["mild", "clay", "cond"]);
    // wavy: no sulphate-free shampoo for wavy hair, so the mild one stands in
    expect(productsFor(products, crop, "wavy").map((x) => x.id)).toEqual(["mild", "clay", "cond"]);
    expect(productsFor(products, crop, "curly").map((x) => x.id)).toEqual(["sf", "curl", "cond"]);
  });
});

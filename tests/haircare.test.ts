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
      id, title: id, brand: null, kind, shops: ["amazon"], gender: "all", hairTypes: [], note: null, image: null, ...extra,
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

describe("shop links (13.10.2026)", () => {
  it("reads the product code from Amazon links and builds the tagged link", async () => {
    const { asinFromLink, amazonLink } = await import("../lib/content/haircare");
    expect(asinFromLink("https://www.amazon.in/Mamaearth-Onion-Shampoo/dp/B07W7CXKPN/ref=sr_1_3?keywords=x")).toBe("B07W7CXKPN");
    expect(asinFromLink("https://www.amazon.in/gp/product/b07w7cxkpn?th=1")).toBe("B07W7CXKPN");
    expect(asinFromLink("https://amzn.in/d/abc")).toBeNull();
    expect(amazonLink("B07W7CXKPN")).toBe("https://www.amazon.in/dp/B07W7CXKPN?tag=tressform-21");
  });
  it("lists a product's shops in a fixed order, including an older single link", async () => {
    const { rowToProduct } = await import("../lib/haircareProducts");
    const base = { id: "x", title: "T", description: null, image_url: null, original_url: null, category: null, price_paise: null, brand: null, kind: "conditioner", gender: "all", hair_types: [], is_active: true, sort_order: 0, created_at: "", updated_at: "" } as const;
    const p = rowToProduct({ ...base, store: null, earnkaro_tracked_url: null, amazon_asin: "B07W7CXKPN", shop_links: { nykaa: "https://nykaa.example/1", flipkart: "https://fk.example/2", myntra: "http://not-https" } } as never)!;
    expect(p.shops).toEqual(["amazon", "flipkart", "nykaa"]);
    const old = rowToProduct({ ...base, store: "Nykaa", earnkaro_tracked_url: "https://ek.example/3", amazon_asin: null, shop_links: {} } as never)!;
    expect(old.shops).toEqual(["nykaa"]);
    expect(rowToProduct({ ...base, store: null, earnkaro_tracked_url: null, amazon_asin: null, shop_links: {} } as never)).toBeNull();
  });
});

describe("product photos (13.10.2026)", () => {
  it("takes only Amazon-hosted images from a SiteStripe code", async () => {
    const { amazonImageFrom } = await import("../lib/content/haircare");
    const code = '<a href="https://www.amazon.in/dp/B0828PRFKP?tag=tressform-21" target="_blank"><img border="0" src="https://m.media-amazon.com/images/I/51abcDEF._SL160_.jpg"></a>';
    expect(amazonImageFrom(code)).toBe("https://m.media-amazon.com/images/I/51abcDEF._SL160_.jpg");
    expect(amazonImageFrom("https://ws-in.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=B0828PRFKP&Format=_SL160_&ID=AsinImage&MarketPlace=IN&ServiceVersion=20070822&WS=1&tag=tressform-21")).toContain("ws-in.amazon-adsystem.com");
    const siteStripe = '<a href="https://www.amazon.in/dp/B0828PRFKP?&linkCode=li2&tag=tressform-21" target="_blank"><img border="0" src="//ws-in.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=B0828PRFKP&Format=_SL160_&ID=AsinImage&MarketPlace=IN&ServiceVersion=20070822&WS=1&tag=tressform-21&language=en_IN" ></a><img src="https://ir-in.amazon-adsystem.com/e/ir?t=tressform-21&language=en_IN&l=li2&o=31&a=B0828PRFKP" width="1" height="1" border="0" alt="" />';
    expect(amazonImageFrom(siteStripe)).toMatch(/^https:\/\/ws-in\.amazon-adsystem\.com\/widgets\/q\?.*ASIN=B0828PRFKP/);
    expect(amazonImageFrom('<img src="https://ir-in.amazon-adsystem.com/e/ir?t=x">')).toBeNull();
    expect(amazonImageFrom('<img src="https://example.com/x.jpg">')).toBeNull();
    expect(amazonImageFrom("")).toBeNull();
  });
});

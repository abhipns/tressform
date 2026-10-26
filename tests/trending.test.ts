import { describe, expect, it } from "vitest";
import { pickTrending, type CareProduct } from "../lib/content/haircare";
import { campaignTotals } from "../lib/stats";

const p = (id: string, trending = false): CareProduct => ({
  id, title: id, brand: null, kind: "conditioner", shops: ["amazon"], gender: "all", hairTypes: [], note: null, image: null, trending,
});

describe("Trending strip on /haircare (26.10.2026)", () => {
  it("shows the owner's ticked products, at most 6, in the owner's order", () => {
    const list = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => p(id, id !== "b"));
    expect(pickTrending(list, { b: 99 }).map((x) => x.id)).toEqual(["a", "c", "d", "e", "f", "g"]);
  });

  it("with none ticked, shows the 6 most tapped in 30 days, leaving out untapped ones", () => {
    const list = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => p(id));
    const taps = { a: 1, b: 5, c: 3, d: 3, e: 2, f: 7, g: 4 };
    expect(pickTrending(list, taps).map((x) => x.id)).toEqual(["f", "b", "g", "c", "d", "e"]);
    expect(pickTrending(list, {})).toEqual([]);
  });
});

describe("By ad campaign Total row (26.10.2026)", () => {
  it("adds up people, sales and money, and Bought % is total sales ÷ total people", () => {
    const t = campaignTotals([
      { visitors: 100, purchases: 3, revenuePaise: 59700 },
      { visitors: 50, purchases: 0, revenuePaise: 0 },
    ]);
    expect(t).toEqual({ visitors: 150, purchases: 3, revenuePaise: 59700, boughtPct: "2.0" });
  });

  it("shows no % when there were no people", () => {
    expect(campaignTotals([]).boughtPct).toBeNull();
  });
});

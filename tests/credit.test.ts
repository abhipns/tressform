import { describe, expect, it } from "vitest";
import { splitWithCredit } from "../lib/credit";

describe("credit at checkout", () => {
  it("takes the credit off the price when ticked", () => {
    expect(splitWithCredit(39_900, 8_000, true)).toEqual({ pricePaise: 39_900, creditPaise: 8_000, duePaise: 31_900 });
  });
  it("charges the full price when unticked, keeping the credit", () => {
    expect(splitWithCredit(39_900, 8_000, false)).toEqual({ pricePaise: 39_900, creditPaise: 0, duePaise: 39_900 });
  });
  it("uses only as much credit as the price — the rest stays in the account", () => {
    expect(splitWithCredit(19_900, 30_000, true)).toEqual({ pricePaise: 19_900, creditPaise: 19_900, duePaise: 0 });
  });
  it("is free when the credit exactly covers the price", () => {
    expect(splitWithCredit(19_900, 19_900, true).duePaise).toBe(0);
  });
  it("ignores a zero or broken balance", () => {
    expect(splitWithCredit(19_900, 0, true)).toEqual({ pricePaise: 19_900, creditPaise: 0, duePaise: 19_900 });
    expect(splitWithCredit(19_900, -500, true).creditPaise).toBe(0);
  });
  it("never uses part of a paisa", () => {
    expect(splitWithCredit(19_900, 1_999.7, true).creditPaise).toBe(1_999);
  });
});

import { takeBack } from "../lib/refunds";

describe("refund: taking back a referrer's credit", () => {
  it("takes it all back when it's still in their balance", () => {
    expect(takeBack(4_000, 10_000)).toEqual({ takenPaise: 4_000, shortPaise: 0 });
  });
  it("takes only what's left if they spent some, and reports the rest", () => {
    expect(takeBack(4_000, 1_500)).toEqual({ takenPaise: 1_500, shortPaise: 2_500 });
  });
  it("takes nothing from an empty or broken balance", () => {
    expect(takeBack(4_000, 0)).toEqual({ takenPaise: 0, shortPaise: 4_000 });
    expect(takeBack(4_000, -50)).toEqual({ takenPaise: 0, shortPaise: 4_000 });
  });
});

// The "why it suits you" lines on the result screen.

import { describe, expect, it } from "vitest";
import { HAIRSTYLES, barberLine, hairstyleById } from "../lib/content/hairstyles";
import { pickStyles, type CustomerHair } from "../lib/recommend";
import { faceReason, reasonsFor } from "../lib/pickReasons";

const SHAPES = ["Oval", "Round", "Square", "Heart", "Diamond", "Long"] as const;

describe("every style", () => {
  it("says what it does to a face", () => {
    for (const style of HAIRSTYLES) expect(style.effects.length, style.id).toBeGreaterThan(0);
  });

  it("has a barber line that reads as a request", () => {
    for (const style of HAIRSTYLES) {
      const line = barberLine(style);
      expect(line, style.id).toMatch(/^Ask for [a-zA-Z]/);
      expect(line.endsWith("."), style.id).toBe(true);
    }
  });

  it("can be found by its id, and nothing else can", () => {
    expect(hairstyleById("m-side-part")?.name).toBe("Classic side part, taper");
    expect(hairstyleById("not-a-style")).toBeNull();
    expect(hairstyleById(undefined)).toBeNull();
    expect(hairstyleById({ id: "m-side-part" })).toBeNull();
  });
});

describe("a women's long-hair cut", () => {
  it("tells the stylist to keep her length, never a length to cut to", () => {
    for (const style of HAIRSTYLES.filter((s) => s.gender === "women" && s.needs === "below-shoulder")) {
      const line = barberLine(style);
      expect(line, style.id).toMatch(/keeps? your length|length kept/);
      expect(line, style.id).not.toMatch(/to the chest/);
    }
  });
});

describe("the face line", () => {
  it("gives a real reason for nearly every best match", () => {
    // A best match with no (shape, effect) sentence falls back to a plain
    // line. A few are allowed; most must have a reason.
    let best = 0;
    let plain = 0;
    for (const style of HAIRSTYLES) {
      for (const shape of style.best) {
        if (shape === "Oval") continue;
        best += 1;
        const pick = { style, faceFit: "best" } as never;
        if (faceReason(pick, shape).startsWith("One of the cuts")) plain += 1;
      }
    }
    expect(plain / best).toBeLessThan(0.06);
  });

  it("never claims a reason for a style that is only acceptable", () => {
    const style = hairstyleById("m-textured-quiff")!; // best: Round, Oval, Square
    const pick = { style, faceFit: "fine" } as never;
    expect(faceReason(pick, "Heart")).toBe("A sound cut for a heart face, though not one of its very best.");
  });
});

describe("the lines under a pick", () => {
  const customers: CustomerHair[] = [];
  for (const faceShape of SHAPES) {
    for (const texture of ["straight", "wavy", "curly"] as const) {
      for (const length of ["very-short", "short", "medium", "medium-long", "long"] as const) customers.push({ gender: "men", faceShape, length, texture });
      for (const length of ["ear", "chin", "shoulder", "below-shoulder", "mid-back", "waist"] as const) {
        customers.push({ gender: "women", faceShape, length, texture });
      }
    }
  }

  it("are two or three different, finished sentences for every pick of every customer", () => {
    for (const customer of customers) {
      const picks = pickStyles(customer);
      for (const pick of [...picks.top, ...picks.more]) {
        const reasons = reasonsFor(pick, customer);
        expect(reasons.length).toBeGreaterThanOrEqual(2);
        expect(reasons.length).toBeLessThanOrEqual(3);
        expect(new Set(reasons).size).toBe(reasons.length);
        for (const reason of reasons) {
          expect(reason).toMatch(/^[A-Z].*\.$/);
          expect(reason).not.toMatch(/undefined|null|NaN/);
        }
      }
    }
  });

  it("share one line for hair and length only when there is nothing to act on", () => {
    for (const customer of customers) {
      const picks = pickStyles(customer);
      for (const pick of [...picks.top, ...picks.more]) {
        const reasons = reasonsFor(pick, customer);
        const plain = !pick.needsDailyStyling && pick.cutToday && pick.stepsShorter === 0;
        expect(reasons.length, pick.style.id).toBe(plain ? 2 : 3);
      }
    }
  });

  it("never tell a top pick to grow their hair first", () => {
    for (const customer of customers) {
      for (const pick of pickStyles(customer).top) {
        expect(reasonsFor(pick, customer).join(" ")).not.toMatch(/growing/);
      }
    }
  });

  it("always say so when a style needs growing or daily styling", () => {
    for (const customer of customers) {
      for (const pick of pickStyles(customer).more) {
        const text = reasonsFor(pick, customer).join(" ");
        if (!pick.cutToday) expect(text, pick.style.id).toMatch(/growing first/);
        if (pick.needsDailyStyling) expect(text, pick.style.id).toMatch(/styling every day/);
      }
    }
  });

  it("names both lengths when a cut is shorter than the customer's hair", () => {
    let seen = 0;
    for (const customer of customers) {
      const picks = pickStyles(customer);
      for (const pick of [...picks.top, ...picks.more]) {
        if (!pick.cutToday || pick.stepsShorter === 0) continue;
        seen += 1;
        expect(reasonsFor(pick, customer)[2], pick.style.id).toMatch(
          customer.gender === "women" ? /^Takes your hair from .+ to .+\.$/ : /^Cuts your hair from .+ to .+\.$/
        );
      }
    }
    expect(seen).toBeGreaterThan(50);
  });
});

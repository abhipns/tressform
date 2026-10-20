import { describe, it, expect } from "vitest";
import { HAIRSTYLES, barberName, barberPoints } from "../lib/content/hairstyles";
import { BARBER_POINTS, splitPoint } from "../lib/content/barberPoints";

describe("barber points", () => {
  it("every style has hand-written points, 4 to 7 labelled lines", () => {
    for (const s of HAIRSTYLES) {
      expect(BARBER_POINTS[s.id], s.id).toBeDefined();
      const pts = barberPoints(s);
      expect(pts.length, s.id).toBeGreaterThanOrEqual(4);
      expect(pts.length, s.id).toBeLessThanOrEqual(7);
      for (const p of pts) {
        expect(p.length, `${s.id}: ${p}`).toBeLessThanOrEqual(75);
        expect(splitPoint(p).label, `${s.id}: "${p}" has no label`).not.toBeNull();
      }
    }
  });
  it("every style says what it is best for", () => {
    for (const s of HAIRSTYLES) expect(barberPoints(s).some((p) => p.startsWith("Best for: ")), s.id).toBe(true);
  });
  it("no points for styles that don't exist", () => {
    const ids = new Set(HAIRSTYLES.map((s) => s.id));
    for (const id of Object.keys(BARBER_POINTS)) expect(ids.has(id), id).toBe(true);
  });
  it("keeps every measurement from the original wording", () => {
    for (const s of HAIRSTYLES) {
      const original = s.barber ?? s.prompt;
      const joined = barberPoints(s).join(" ");
      for (const m of original.match(/\d+(–\d+)? (cm|mm)/g) ?? []) expect(joined, `${s.id} lost ${m}`).toContain(m);
    }
  });
  it("splits a point into its label and text", () => {
    expect(splitPoint("Sides: low taper, #2 to #0.5")).toEqual({ label: "Sides", text: "low taper, #2 to #0.5" });
    expect(splitPoint("no label here")).toEqual({ label: null, text: "no label here" });
  });
  it("names the cut", () => {
    expect(barberName(HAIRSTYLES.find((s) => s.id === "m-textured-quiff")!)).toBe("a short textured quiff");
  });
});

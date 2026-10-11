// The photo reading: what the site does with the vision model's answer.
// The model itself cannot be called from a test, so these check the part
// that is ours: the question that is asked, and that only answers from the
// fixed lists ever get through.

import { describe, expect, it } from "vitest";
import { buildReadingPrompt, parseReading } from "../lib/integrations/vision";

describe("parseReading", () => {
  it("reads a clean answer", () => {
    const reading = parseReading(
      '{"widest_part":"cheekbones","jaw":"rounded","length_vs_width":"a little longer","face_shape":"Oval","second_shape":"Round","sure":"medium","hair_length":"short","hair_type":"wavy"}',
      "men"
    );
    expect(reading).toMatchObject({
      ok: true,
      faceShape: "Oval",
      secondFaceShape: "Round",
      sure: "medium",
      hairLength: "short",
      hairTexture: "wavy",
    });
    expect(reading.observations).toEqual({ widest_part: "cheekbones", jaw: "rounded", length_vs_width: "a little longer" });
  });

  it("reads an answer wrapped in a code block, with different capital letters", () => {
    const reading = parseReading('```json\n{"face_shape":"square","second_shape":"OVAL","sure":"High","hair_length":"Below Shoulder","hair_type":"Curly"}\n```', "women");
    expect(reading).toMatchObject({ ok: true, faceShape: "Square", secondFaceShape: "Oval", sure: "high", hairLength: "below-shoulder", hairTexture: "curly" });
  });

  it("takes oblong and rectangle as Long", () => {
    expect(parseReading('{"face_shape":"Oblong"}', "men").faceShape).toBe("Long");
    expect(parseReading('{"face_shape":"rectangle"}', "men").faceShape).toBe("Long");
  });

  it("keeps the face shape when the hair could not be judged", () => {
    const reading = parseReading('{"face_shape":"Heart","second_shape":"Oval","sure":"low","hair_length":null,"hair_type":null}', "women");
    expect(reading).toMatchObject({ ok: true, faceShape: "Heart", hairLength: null, hairTexture: null });
  });

  it("drops a hair length that belongs to the other list", () => {
    // "medium" is a men's length; a woman's reading must not carry it.
    expect(parseReading('{"face_shape":"Round","hair_length":"medium"}', "women").hairLength).toBeNull();
    expect(parseReading('{"face_shape":"Round","hair_length":"shoulder"}', "men").hairLength).toBeNull();
  });

  it("drops a second shape that repeats the first", () => {
    expect(parseReading('{"face_shape":"Round","second_shape":"Round"}', "men").secondFaceShape).toBeNull();
  });

  it("is not a reading when there is no usable face shape", () => {
    expect(parseReading('{"face_shape":"pear","hair_type":"wavy"}', "men").ok).toBe(false);
    expect(parseReading("I cannot assess people in photos.", "men").ok).toBe(false);
    expect(parseReading('{"face_shape": "Oval"', "men").ok).toBe(false);
  });
});

describe("buildReadingPrompt", () => {
  it("asks about hair length in the right terms for men and for women", () => {
    expect(buildReadingPrompt("men")).toContain('"very-short"');
    expect(buildReadingPrompt("men")).not.toContain('"below-shoulder"');
    expect(buildReadingPrompt("women")).toContain('"below-shoulder"');
    expect(buildReadingPrompt("women")).not.toContain('"very-short"');
  });

  it("asks for what is seen before the face shape", () => {
    const prompt = buildReadingPrompt("men");
    expect(prompt.indexOf('"widest_part"')).toBeLessThan(prompt.indexOf('"face_shape"'));
  });
});

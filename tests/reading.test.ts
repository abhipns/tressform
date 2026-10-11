// The photo reading: what the site does with the vision model's answer.
// The model itself cannot be called from a test, so these check the part
// that is ours: the question that is asked, and that only answers from the
// fixed lists ever get through.

import { describe, expect, it } from "vitest";
import { buildReadingPrompt, parseReading, settleReadings, shapeFromObservations, type PhotoReading } from "../lib/integrations/vision";

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

describe("the two wordings of the question", () => {
  it("ask for the same things in a different order", () => {
    for (const gender of ["men", "women"] as const) {
      const first = buildReadingPrompt(gender, 0);
      const second = buildReadingPrompt(gender, 1);
      expect(second).not.toBe(first);
      // The same lines, whatever the order.
      expect(second.split("\n").filter(Boolean).sort()).toEqual(first.split("\n").filter(Boolean).sort());
      expect(first.indexOf('"Round"')).toBeLessThan(first.indexOf('"Diamond"'));
      expect(second.indexOf('"Diamond"')).toBeLessThan(second.indexOf('"Round"'));
      expect(second.indexOf('"hair_type"')).toBeLessThan(second.indexOf('"face_shape"'));
    }
  });

  it("warn about a receding hairline and about curly hair", () => {
    const prompt = buildReadingPrompt("men");
    expect(prompt).toContain("a high or receding hairline does not make the forehead the widest part");
    expect(prompt).toContain("Judge curly hair by where it ends");
    expect(buildReadingPrompt("women")).toContain("Judge curly hair by where it ends");
  });
});

describe("settling two readings of one photo", () => {
  const reading = (over: Partial<PhotoReading>): PhotoReading => ({
    ok: true,
    faceShape: "Round",
    secondFaceShape: "Square",
    sure: "high",
    hairLength: "short",
    hairTexture: "straight",
    observations: null,
    model: "test",
    costPaise: 5,
    note: "",
    mock: false,
    ...over,
  });
  const failed = reading({ ok: false, faceShape: null, secondFaceShape: null, sure: null, hairLength: null, hairTexture: null, note: "no answer", costPaise: null });

  it("keeps the answer, and how sure it was, when both agree", () => {
    const settled = settleReadings(reading({}), reading({ secondFaceShape: "Oval" }));
    expect(settled).toMatchObject({ ok: true, faceShape: "Round", secondFaceShape: "Square", sure: "high", agreed: true, costPaise: 10 });
  });

  it("marks the reading unsure, with the other shape as second guess, when they differ", () => {
    // The real case from the first run: one question said Heart, the other Round, both "sure".
    const settled = settleReadings(reading({ faceShape: "Heart", secondFaceShape: "Oval" }), reading({ faceShape: "Round" }));
    expect(settled).toMatchObject({ ok: true, faceShape: "Heart", secondFaceShape: "Round", sure: "low", agreed: false });
  });

  // The real cases from the second run on the owner's photos (11.10.2026).
  const little = { widest_part: "all similar", jaw: "rounded", length_vs_width: "a little longer" };
  const equal = { widest_part: "all similar", jaw: "rounded", length_vs_width: "about equal" };

  it("settles Long against Oval as Oval when the face was seen as only a little longer than wide", () => {
    const settled = settleReadings(reading({ faceShape: "Long", observations: little }), reading({ faceShape: "Oval", observations: little }));
    expect(settled).toMatchObject({ faceShape: "Oval", secondFaceShape: "Long", sure: "medium", agreed: false, settledBy: "observations" });
  });

  it("settles Round against Oval as Round when the face was seen as about as wide as long", () => {
    const settled = settleReadings(reading({ faceShape: "Round", observations: equal }), reading({ faceShape: "Oval", observations: equal }));
    expect(settled).toMatchObject({ faceShape: "Round", secondFaceShape: "Oval", sure: "medium", settledBy: "observations" });
  });

  it("leaves it unsure when what was seen points to neither shape", () => {
    // One photo was called Long and Round, with observations that say Oval.
    const settled = settleReadings(reading({ faceShape: "Long", observations: little }), reading({ faceShape: "Round", observations: little }));
    expect(settled).toMatchObject({ faceShape: "Long", secondFaceShape: "Round", sure: "low" });
    expect(settled.settledBy).toBeUndefined();
  });

  it("leaves it unsure when the two readings saw different things", () => {
    const settled = settleReadings(reading({ faceShape: "Round", observations: equal }), reading({ faceShape: "Oval", observations: little }));
    expect(settled).toMatchObject({ faceShape: "Round", sure: "low" });
  });

  it("never overrules two readings that agree", () => {
    // Both said Long although the face was seen as only a little longer: the agreement stands.
    const settled = settleReadings(reading({ faceShape: "Long", observations: little }), reading({ faceShape: "Long", observations: little }));
    expect(settled).toMatchObject({ faceShape: "Long", agreed: true, sure: "high" });
  });

  it("is never more than medium sure on one reading alone", () => {
    expect(settleReadings(reading({}), failed)).toMatchObject({ ok: true, faceShape: "Round", sure: "medium", agreed: null, costPaise: 5 });
    expect(settleReadings(failed, reading({ sure: "low" }))).toMatchObject({ ok: true, faceShape: "Round", sure: "low", agreed: null });
  });

  it("is no reading when neither came back", () => {
    expect(settleReadings(failed, failed)).toMatchObject({ ok: false, faceShape: null, agreed: null, costPaise: null });
  });

  it("fills in hair the first reading could not tell from the second", () => {
    const settled = settleReadings(reading({ hairLength: null }), reading({ hairLength: "medium", hairTexture: "wavy" }));
    expect(settled).toMatchObject({ hairLength: "medium", hairTexture: "straight" });
  });
});

describe("the shape that follows from what was seen", () => {
  it("is only given where the observations are clear-cut", () => {
    expect(shapeFromObservations({ length_vs_width: "much longer", widest_part: "all similar", jaw: "rounded" })).toBe("Long");
    expect(shapeFromObservations({ length_vs_width: "about equal", widest_part: "all similar", jaw: "angular" })).toBe("Square");
    expect(shapeFromObservations({ length_vs_width: "about equal", widest_part: "cheekbones", jaw: "rounded" })).toBe("Round");
    expect(shapeFromObservations({ length_vs_width: "a little longer", widest_part: "forehead", jaw: "pointed" })).toBe("Heart");
    expect(shapeFromObservations({ length_vs_width: "a little longer", widest_part: "cheekbones", jaw: "pointed" })).toBe("Diamond");
    expect(shapeFromObservations({ length_vs_width: "a little longer", widest_part: "cheekbones", jaw: "rounded" })).toBe("Oval");
    // A little longer, even widths, angular jaw: could be Square or Long. No opinion.
    expect(shapeFromObservations({ length_vs_width: "a little longer", widest_part: "all similar", jaw: "angular" })).toBeNull();
    expect(shapeFromObservations({})).toBeNull();
    expect(shapeFromObservations(null)).toBeNull();
  });
});

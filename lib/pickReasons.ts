// Tressform — why a hairstyle was picked, in words a customer can use.
//
// 11.10.2026, for the result screen. lib/recommend.ts decides WHICH styles
// a customer is shown; this file says WHY, in three short lines per style:
//   1. the face: what the cut does for their face shape
//   2. the hair: whether it works with their hair type as it is
//   3. the length: whether it keeps their length, takes some off, or needs
//      growing first
//
// The face line is the one a stylist would give. Each style lists what it
// does to the look of a face (`effects` in lib/content/hairstyles.ts) and
// FACE_REASONS below holds a sentence for each (face shape, effect) pair
// that is a real reason. It is only used when the style is one of the best
// for that face shape, so a sentence is never claimed for a style that is
// merely acceptable.
//
// Nothing here changes which styles are picked or in what order.

import type { FaceShape } from "./faceShape";
import { MEN_LENGTHS, WOMEN_LENGTHS, type HairLength, type HairTexture, type StyleEffect } from "./content/hairstyles";
import type { CustomerHair, StylePick } from "./recommend";

const FACE_REASONS: Record<FaceShape, Partial<Record<StyleEffect, string>>> = {
  Round: {
    height: "The height on top makes a round face look longer.",
    "side-sweep": "The sweep to one side breaks up the roundness.",
    "long-lines": "Length falling past the chin makes a round face look slimmer.",
    "face-framing": "The front pieces cover the widest part of the cheeks.",
    sharp: "Clean, neat lines give a round face more definition.",
  },
  Square: {
    height: "The height on top balances a strong jaw.",
    "soft-texture": "The soft texture takes the hard edge off a square jaw.",
    "side-sweep": "The sweep to one side softens a square forehead.",
    "side-volume": "Soft fullness at the sides rounds off a square outline.",
    "long-lines": "Length falling past the jaw softens its corners.",
    "soft-length": "Longer, soft hair takes the edge off a square jaw.",
    "face-framing": "The front pieces soften the corners of the jaw.",
    sharp: "Clean lines suit a strong jaw.",
    "show-face": "It shows off a strong jawline.",
  },
  Long: {
    fringe: "The fringe shortens a long face.",
    "side-sweep": "Hair across the forehead shortens a long face.",
    "side-volume": "Fullness at the sides adds width to a long face.",
    "width-low": "The fullness at the ends adds width, which balances a long face.",
    "low-top": "It sits low on top, so it adds no extra length to the face.",
  },
  Heart: {
    fringe: "The fringe narrows a wide forehead.",
    "side-sweep": "The sweep across the forehead makes it look narrower.",
    "side-volume": "Fullness lower down balances a narrow chin.",
    "width-low": "Fullness around the jaw and neck balances a narrow chin.",
    "soft-length": "Hair around the neck fills out a narrow chin.",
    "show-face": "It shows off the cheekbones and a neat chin.",
  },
  Diamond: {
    fringe: "Hair on the forehead adds width where a diamond face is narrow.",
    "side-sweep": "Hair swept across the top adds width at the forehead, where a diamond face is narrow.",
    height: "Fullness on top adds width at the forehead, which balances the cheekbones.",
    "width-low": "Fullness below the cheekbones balances them.",
    "soft-length": "Longer, soft hair softens sharp cheekbones.",
    "soft-texture": "The soft texture softens strong cheekbones.",
    "face-framing": "The front pieces soften wide cheekbones.",
    sharp: "Clean, short sides show off the cheekbones.",
    "show-face": "It shows off the cheekbones.",
  },
  // An oval face is the balanced one: most cuts suit it, so there is no
  // effect to explain.
  Oval: {},
};

const TEXTURE_WORD: Record<HairTexture, string> = { straight: "straight", wavy: "wavy", curly: "curly" };

/** The short length names used inside a sentence. */
const LENGTH_WORD: Record<HairLength, string> = {
  "very-short": "very short",
  short: "short",
  medium: "medium length",
  long: "long",
  ear: "ear length",
  chin: "chin length",
  shoulder: "shoulder length",
  "below-shoulder": "below the shoulder",
  "mid-back": "mid-back length",
  waist: "waist length",
};

function article(shape: FaceShape): string {
  return shape === "Oval" ? "an" : "a";
}

export function faceReason(pick: StylePick, faceShape: FaceShape): string {
  const shape = faceShape.toLowerCase();
  if (pick.faceFit !== "best") return `A sound cut for ${article(faceShape)} ${shape} face, though not one of its very best.`;
  if (faceShape === "Oval") return "An oval face is balanced, so it carries this cut easily.";
  for (const effect of pick.style.effects) {
    const sentence = FACE_REASONS[faceShape][effect];
    if (sentence) return sentence;
  }
  return `One of the cuts most often recommended for ${article(faceShape)} ${shape} face.`;
}

export function hairReason(pick: StylePick, texture: HairTexture): string {
  const hair = TEXTURE_WORD[texture];
  return pick.needsDailyStyling
    ? `On ${hair} hair it needs styling every day (a blow-dry or some product).`
    : `Works with ${hair} hair as it is.`;
}

export function lengthReason(pick: StylePick, customer: CustomerHair): string {
  if (!pick.cutToday) {
    const months = pick.monthsToGrow ?? 1;
    return `Your hair needs about ${months} ${months === 1 ? "month" : "months"} of growing first.`;
  }
  if (customer.gender === "women") {
    if (pick.stepsShorter === 0) {
      return pick.style.needs === "below-shoulder" ? "Keeps your length." : "Keeps the length you have now.";
    }
    const lengths = WOMEN_LENGTHS as readonly string[];
    const finished = lengths[lengths.indexOf(customer.length) - pick.stepsShorter] as HairLength | undefined;
    return finished
      ? `Takes your hair from ${LENGTH_WORD[customer.length]} to ${LENGTH_WORD[finished]}.`
      : "Shorter than your hair is now.";
  }
  if (pick.stepsShorter === 0) return "Uses the length you have now.";
  const lengths = MEN_LENGTHS as readonly string[];
  const finished = lengths[lengths.indexOf(customer.length) - pick.stepsShorter] as HairLength | undefined;
  return finished ? `Cuts your hair from ${LENGTH_WORD[customer.length]} to ${LENGTH_WORD[finished]}.` : "Shorter than your hair is now.";
}

export const UPKEEP_LABEL = { low: "Low upkeep", medium: "Some upkeep", high: "High upkeep" } as const;

/**
 * The lines shown under a picked style: the face first, then the hair and
 * the length. When the cut works with the hair as it is and keeps its
 * length, those two say nothing the customer has to act on, so they share
 * one line; a cut that needs daily styling, takes length off or needs
 * growing gets a line of its own for each.
 */
export function reasonsFor(pick: StylePick, customer: CustomerHair): string[] {
  const face = faceReason(pick, customer.faceShape);
  // 14.10.2026: how the cut goes with a man's beard or stubble, when it helps.
  const beard = pick.beardReason ? [pick.beardReason] : [];
  if (!pick.needsDailyStyling && pick.cutToday && pick.stepsShorter === 0) {
    const keeps =
      customer.gender === "women" && pick.style.needs === "below-shoulder" ? "keeps your length" : "uses the length you have now";
    return [face, ...beard, `Works with your ${TEXTURE_WORD[customer.texture]} hair as it is, and ${keeps}.`];
  }
  return [face, ...beard, hairReason(pick, customer.texture), lengthReason(pick, customer)];
}

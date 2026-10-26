// Tressform — choosing a customer's hairstyles (the SOP, as code).
//
// 10.10.2026. Written from the owner's rules, the most important being his:
// "the top 5 hairstyles should be about haircuts (trimming hair and not
// about growing hair)". A customer who comes for a haircut is shown cuts
// they can get today; styles they would have to grow into come after, and
// say so.
//
// The rules, in the order they are applied:
//   1. Never show a style marked "avoid" for the face shape, or one that
//      does not work with the hair type.
//   2. A style is a "cut today" when the hair it needs is no longer than
//      the customer's hair now; otherwise it "needs growing".
//   3. The top 5 are cuts today only. Fewer than 5 possible → fewer shown.
//   4. Picks 6–10 are the next best matches and may need growing.
//   5. Best match score first (face shape, hair type, how close the cut
//      is to the hair they have, upkeep); ties go to the style earlier
//      in the list.
//   6. At most 2 of the top 5 from one family (1 from the family that
//      differs only at the back), so the five look different.
//   7. Women: at most 2 of the top 5 are a big change (two or more length
//      steps shorter than her hair now), and at least 1 is clearly shorter
//      than her hair now when such a cut suits her. Long-hair trims look
//      much alike from the front (the owner's comparison sheets showed
//      it), so without this a long-haired woman would get five pictures
//      that are hard to tell apart.
// Rules 6 and 7 give way before the top 5 is left short: five suitable
// cuts beat three varied ones.
//
// 13.10.2026 (owner): the customer can narrow the list to short, medium or
// long cuts (LengthBand). The same rules then choose from that length only,
// so someone who wants to stay short never sees only longer cuts.
//
// 14.10.2026 (owner: "it has to take care of … beard factor"): for men,
// facial hair nudges the score (beardAdjustment below). The photo reading
// says clean-shaven / stubble / beard / moustache, and the customer can
// correct it. A beard adds weight and length to the lower face, so:
//   - long face: height on top makes it look longer still (lower); fullness
//     at the sides or a fringe balances it (higher);
//   - round face: height on top, with the beard, makes it look longer and
//     slimmer (higher);
//   - any face: neat, short, structured cuts frame a beard well (higher).
// Stubble counts half. Clean-shaven or a moustache only: no change. The
// nudges are small next to face shape and hair type, which still decide.
//
// 26.10.2026 (owner): the "Hairstyles of the World" styles can be tried by
// anyone, but the picker only offers one when it truly fits
// (worldStyleFits below): the customer's face shape is one of the two it
// suits most, it works with their hair as it is, and they can have it done
// today. Even then at most one of them is in the top 5 (more only when the
// top 5 couldn't be filled otherwise), and none in the longer list below
// it, which stays Tressform's own styles.
//
// Nothing here talks to a database or an image model; it is a plain
// function so it can be tested against every kind of customer.

import type { FaceShape } from "@/lib/faceShape";
import {
  HAIRSTYLES,
  WORLD_HAIRSTYLES,
  MEN_LENGTHS,
  WOMEN_LENGTHS,
  type HairGender,
  type HairLength,
  type HairTexture,
  type Hairstyle,
  type StyleNeeds,
} from "./content/hairstyles";

/** What the photo reading (or the customer) says about a man's facial hair. */
export type FacialHair = "clean" | "stubble" | "beard" | "moustache";
export const FACIAL_HAIR_OPTIONS: FacialHair[] = ["clean", "stubble", "beard", "moustache"];

export interface CustomerHair {
  gender: HairGender;
  /** Men: facial hair, from the photo reading or the customer's correction; null = not known. */
  facialHair?: FacialHair | null;
  faceShape: FaceShape;
  /** The second guess, when the face reading is under 60% sure: styles to avoid for it are left out too. */
  secondFaceShape?: FaceShape | null;
  length: HairLength;
  texture: HairTexture;
}

export interface StylePick {
  style: Hairstyle;
  /** 0–98, shown to the customer as a percentage. */
  score: number;
  cutToday: boolean;
  /** Roughly how long the hair must grow first; null for a cut today. */
  monthsToGrow: number | null;
  /** How many length steps shorter than the customer's hair now the finished cut is (0 = keeps the length). */
  stepsShorter: number;
  /** Women only: two or more length steps shorter than her hair now. */
  bigChange: boolean;
  faceFit: "best" | "fine";
  needsDailyStyling: boolean;
  /** 14.10.2026: why the cut goes well with the customer's beard or stubble, when it does. */
  beardReason: string | null;
}

export interface StylePicks {
  /** Up to 5, all cuts the customer can get today. */
  top: StylePick[];
  /** Up to 5 more that suit; may need growing. */
  more: StylePick[];
  /** How many suitable cuts were possible today, before choosing 5. */
  cutsPossibleToday: number;
}

/**
 * 21.10.2026 (owner: the barber's first question is "how do you want it?"):
 * the customer says how much shorter they want to go, before seeing their
 * list. "keep" = the length they have (a shape-up), "little" = one length
 * step shorter, "short" = a short cut, "all" = no limit.
 */
export type WantLength = "keep" | "little" | "short" | "all";
export const WANT_LENGTHS: WantLength[] = ["keep", "little", "short", "all"];
export const WANT_LABELS: Record<WantLength, { label: string; hint: string; icon: string }> = {
  keep: { label: "Keep my length", hint: "Just a new shape", icon: "✂️" },
  little: { label: "A little shorter", hint: "Trim it down a bit", icon: "✂️" },
  short: { label: "Go short", hint: "A properly short cut", icon: "✂️" },
  all: { label: "Show me everything", hint: "Any length", icon: "👀" },
};

/** Whether a pick fits what the customer wants. */
export function fitsWish(pick: StylePick, wish: WantLength | null | undefined): boolean {
  switch (wish) {
    case "keep":
      return pick.cutToday && pick.stepsShorter === 0;
    case "little":
      return pick.cutToday && pick.stepsShorter === 1;
    case "short":
      return pick.cutToday && lengthBand(pick.style) === "short";
    default:
      return true;
  }
}

/** How long a cut is once finished, for the customer's Short / Medium / Long filter. */
export type LengthBand = "short" | "medium" | "long";
export const LENGTH_BANDS: LengthBand[] = ["short", "medium", "long"];

/** Labels for the filter: what each band means for men and for women. */
export const LENGTH_BAND_LABELS: Record<HairGender, Record<LengthBand, { label: string; hint: string }>> = {
  men: {
    short: { label: "Short", hint: "up to 5 cm on top" },
    medium: { label: "Medium", hint: "5 to 10 cm" },
    long: { label: "Long", hint: "over 10 cm" },
  },
  women: {
    short: { label: "Short", hint: "ear to chin" },
    medium: { label: "Medium", hint: "shoulder" },
    long: { label: "Long", hint: "below the shoulder" },
  },
};

/** The length a style ends at: its `needs` is the length the cut is made at. */
export function lengthBand(style: Hairstyle): LengthBand {
  switch (style.needs) {
    case "very-short":
    case "short":
    case "ear":
    case "chin":
      return "short";
    case "medium":
    case "medium-long":
    case "shoulder":
      return "medium";
    default:
      return "long";
  }
}

export const TOP_COUNT = 5;
export const MORE_COUNT = 5;
const MAX_SHOWN_SCORE = 98;
const FAMILY_LIMIT = 2;
const FAMILY_LIMITS: Record<string, number> = { "back-shape": 1 };
const BIG_CHANGE_LIMIT = 2;

const TEXTURE_INDEX: Record<HairTexture, 0 | 1 | 2> = { straight: 0, wavy: 1, curly: 2 };
const UPKEEP_POINTS = { low: 8, medium: 6, high: 4 } as const;

// Men, in cm of hair on top: the least each length class means, and a
// typical figure for a customer in it. Hair grows about 1 cm a month.
// 14.10.2026: "medium" split into 5–7 and 7–10 cm (lib/content/hairstyles.ts).
const MEN_NEEDS_CM = [0, 2, 5, 7, 10];
const MEN_TYPICAL_CM = [1, 3.5, 6, 8.5, 12];
// Women: ear → chin → shoulder → below the shoulder is roughly 8 cm a step.
const WOMEN_MONTHS_PER_STEP = 8;

function currentRank(gender: HairGender, length: HairLength): number {
  const rank =
    gender === "men" ? MEN_LENGTHS.indexOf(length as never) : WOMEN_LENGTHS.indexOf(length as never);
  if (rank < 0) throw new Error(`"${length}" is not a ${gender === "men" ? "men's" : "women's"} hair length.`);
  return rank;
}

function needsRank(gender: HairGender, needs: StyleNeeds): number {
  return gender === "men" ? MEN_LENGTHS.indexOf(needs as never) : WOMEN_LENGTHS.indexOf(needs as never);
}

function monthsToGrow(gender: HairGender, current: number, needed: number): number {
  if (gender === "men") return Math.max(1, Math.ceil(MEN_NEEDS_CM[needed] - MEN_TYPICAL_CM[current]));
  return (needed - current) * WOMEN_MONTHS_PER_STEP;
}

/**
 * Whether a style can be cut from the hair the customer has now (no
 * growing first). Used by /api/generate to tell the image model the cut
 * must not come out longer than their hair is today.
 */
export function canCutToday(gender: HairGender, length: HairLength, style: Hairstyle): boolean {
  if (style.gender !== gender) return false;
  const current = gender === "men" ? MEN_LENGTHS.indexOf(length as never) : WOMEN_LENGTHS.indexOf(length as never);
  if (current < 0) return false;
  return current >= needsRank(gender, style.needs);
}

/** The beard's nudge to a man's score, and a reason to show when it helps (see the note at the top). */
export function beardAdjustment(style: Hairstyle, customer: CustomerHair): { points: number; reason: string | null } {
  if (customer.gender !== "men") return { points: 0, reason: null };
  const weight = customer.facialHair === "beard" ? 1 : customer.facialHair === "stubble" ? 0.5 : 0;
  if (weight === 0) return { points: 0, reason: null };
  const word = customer.facialHair === "beard" ? "beard" : "stubble";
  const has = (e: string) => style.effects.includes(e as never);
  let points = 0;
  let reason: string | null = null;
  if (customer.faceShape === "Long") {
    if (has("height")) points -= 6 * weight;
    if (has("side-volume") || has("fringe")) {
      points += 4 * weight;
      reason = `With your ${word}, this keeps your face from looking longer.`;
    }
  }
  if (customer.faceShape === "Round" && has("height")) {
    points += 4 * weight;
    reason = `With your ${word}, the height on top makes your face look longer and slimmer.`;
  }
  if (has("sharp") || has("show-face")) {
    points += 3 * weight;
    reason ??= `Neat, short lines frame your ${word} well.`;
  }
  return { points: Math.round(points), reason: points > 0 ? reason : null };
}

function rate(style: Hairstyle, customer: CustomerHair): StylePick | null {
  if (style.avoid.includes(customer.faceShape)) return null;
  if (customer.secondFaceShape && style.avoid.includes(customer.secondFaceShape)) return null;
  const textureFit = style.texture[TEXTURE_INDEX[customer.texture]];
  if (textureFit === 0) return null;

  const current = currentRank(customer.gender, customer.length);
  const needed = needsRank(customer.gender, style.needs);
  const cutToday = current >= needed;
  const faceFit = style.best.includes(customer.faceShape) ? "best" : "fine";

  // A women's long-hair cut keeps her own length; every other style ends
  // at the length it is named for.
  const finished = customer.gender === "women" && style.needs === "below-shoulder" ? current : needed;
  const bigChange = customer.gender === "women" && cutToday && current - finished >= 2;

  // Face shape: the first shape in a style's `best` list is the one it is
  // most recommended for.
  const bestRank = style.best.indexOf(customer.faceShape);
  const facePoints = bestRank === 0 ? 45 : bestRank === 1 ? 42 : bestRank > 1 ? 39 : 28;
  // "Uses the hair you have": a customer who comes for a haircut is shown
  // cuts close to their present length before much shorter ones.
  const stepsShorter = Math.max(0, current - finished);
  const lengthPoints = !cutToday ? 0 : stepsShorter === 0 ? 15 : stepsShorter === 1 ? 10 : stepsShorter === 2 ? 4 : 0;
  const beard = beardAdjustment(style, customer);
  const score = facePoints + (textureFit === 2 ? 30 : 15) + lengthPoints + UPKEEP_POINTS[style.upkeep] + beard.points;

  return {
    style,
    score: Math.min(MAX_SHOWN_SCORE, score),
    cutToday,
    monthsToGrow: cutToday ? null : monthsToGrow(customer.gender, current, needed),
    stepsShorter: cutToday ? stepsShorter : 0,
    bigChange,
    faceFit,
    needsDailyStyling: textureFit === 1,
    beardReason: beard.reason,
  };
}

/** 26.10.2026: a world style is offered only when it truly fits (see the note at the top). */
export const WORLD_IN_TOP_LIMIT = 1;

export function worldStyleFits(style: Hairstyle, customer: CustomerHair): boolean {
  if (style.gender !== customer.gender) return false;
  if (!style.best.slice(0, 2).includes(customer.faceShape)) return false;
  if (style.avoid.includes(customer.faceShape) || (customer.secondFaceShape && style.avoid.includes(customer.secondFaceShape))) return false;
  if (style.texture[TEXTURE_INDEX[customer.texture]] !== 2) return false;
  return currentRank(customer.gender, customer.length) >= needsRank(customer.gender, style.needs);
}

export function pickStyles(customer: CustomerHair, band: LengthBand | null = null, wish: WantLength | null = null): StylePicks {
  // HAIRSTYLES is in tie-break order and Array.sort is stable, so equal
  // scores keep the list's order. World styles come after, and only the
  // ones that truly fit.
  const candidates = [...HAIRSTYLES, ...WORLD_HAIRSTYLES.filter((style) => worldStyleFits(style, customer))];
  const rated = candidates.filter((style) => style.gender === customer.gender && (!band || lengthBand(style) === band))
    .map((style) => rate(style, customer))
    .filter((pick): pick is StylePick => pick !== null)
    .filter((pick) => fitsWish(pick, wish))
    // Equal scores: the cut closer to the hair they have now goes first.
    .sort((a, b) => b.score - a.score || a.stepsShorter - b.stepsShorter);

  const cuts = rated.filter((pick) => pick.cutToday);
  const top: StylePick[] = [];
  const perFamily = new Map<string, number>();
  let bigChanges = 0;

  const take = (pick: StylePick) => {
    top.push(pick);
    perFamily.set(pick.style.family, (perFamily.get(pick.style.family) ?? 0) + 1);
    if (pick.bigChange) bigChanges += 1;
  };
  const familyFull = (pick: StylePick) =>
    (perFamily.get(pick.style.family) ?? 0) >= (FAMILY_LIMITS[pick.style.family] ?? FAMILY_LIMIT);
  const bigChangeFull = (pick: StylePick) => pick.bigChange && bigChanges >= BIG_CHANGE_LIMIT;
  // At most one world style in the top 5, unless the five can't be filled otherwise.
  const worldFull = (pick: StylePick) =>
    Boolean(pick.style.world) && top.filter((p) => p.style.world).length >= WORLD_IN_TOP_LIMIT;

  // Three passes: both variety rules, then without the family rule, then
  // without either — so the rules shape the five but never shorten them.
  const passes: ((pick: StylePick) => boolean)[] = [
    (pick) => !familyFull(pick) && !bigChangeFull(pick) && !worldFull(pick),
    (pick) => !bigChangeFull(pick) && !worldFull(pick),
    () => true,
  ];
  for (const allowed of passes) {
    for (const pick of cuts) {
      if (top.length >= TOP_COUNT) break;
      if (!top.includes(pick) && allowed(pick)) take(pick);
    }
  }

  // Rule 7, second half: a woman's five include one clearly shorter cut.
  if (customer.gender === "women" && top.length === TOP_COUNT && !top.some((pick) => pick.stepsShorter >= 1)) {
    const shorter = cuts.find((pick) => pick.stepsShorter >= 1 && !top.includes(pick) && !pick.style.world);
    if (shorter) {
      top.sort((a, b) => b.score - a.score || a.stepsShorter - b.stepsShorter);
      top[TOP_COUNT - 1] = shorter;
    }
  }
  top.sort((a, b) => b.score - a.score || a.stepsShorter - b.stepsShorter);

  const more = rated.filter((pick) => !top.includes(pick) && !pick.style.world).slice(0, MORE_COUNT);
  return { top, more, cutsPossibleToday: cuts.length };
}

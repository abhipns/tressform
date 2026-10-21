// Tressform — which salons suit a hairstyle: the first, simple version of
// Style Match (21.10.2026).
//
// A customer picks a hairstyle on the results page and taps "Get this look
// at a salon". The hairstyle's own description (lib/content/hairstyles.ts)
// says what the cut needs — a fade, a taper, curls, a bob… — and salons
// that said they're good at those things (salons.specialities) come first.
// The customer's gender decides who the salon must serve (men's styles:
// salons for men or unisex). Later versions can add the stylists' own
// specialities, hair type, portfolio, price, distance and reviews.

import { hairstyleById, type Hairstyle } from "./content/hairstyles";

const RULES: [RegExp, string][] = [
  [/\bfade\b/i, "FADE"],
  [/\btaper/i, "TAPER"],
  [/\bcrew cut\b/i, "CREW_CUT"],
  [/\bundercut\b|\btwo-block\b/i, "UNDERCUT"],
  [/\bcurl/i, "CURLY_HAIR"],
  [/\bwav(y|es)\b/i, "WAVY_HAIR"],
  [/\bbob\b|\blob\b/i, "BOB"],
  [/\bpixie\b/i, "SHORT_WOMENS_HAIR"],
  [/\blayer/i, "LAYERED_HAIR"],
  [/\bmullet\b|\bwolf cut\b|\bshag\b|\bbutterfly\b|\btwo-block\b|\bfrench crop\b/i, "CREATIVE_TRENDING"],
];

/** The salon specialities a hairstyle calls for, most specific first. */
export function specialitiesForStyle(style: Hairstyle): string[] {
  const text = `${style.name} ${style.prompt}`;
  const out = RULES.filter(([re]) => re.test(text)).map(([, id]) => id);
  if (style.family === "long" || style.needs === "below-shoulder") out.push("LONG_HAIR");
  if (style.gender === "women" && (style.needs === "ear" || style.needs === "chin")) out.push("SHORT_WOMENS_HAIR");
  return Array.from(new Set(out));
}

/** Who the salon must serve for this hairstyle: men's styles → MEN or UNISEX. */
export function customerTypesForStyle(style: Hairstyle): string[] {
  return style.gender === "women" ? ["WOMEN", "UNISEX"] : ["MEN", "UNISEX"];
}

export function styleMatchFor(styleId: string | null | undefined) {
  const style = hairstyleById(styleId ?? undefined);
  if (!style) return null;
  return { style, specialities: specialitiesForStyle(style), customerTypes: customerTypesForStyle(style) };
}

/** How well a salon fits: how many of the wanted specialities it has. */
export function matchScore(salonSpecialities: string[], wanted: string[]): number {
  const have = new Set(salonSpecialities);
  return wanted.filter((w) => have.has(w)).length;
}

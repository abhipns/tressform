// Hairstyles of the World (26.10.2026, owner's request) — the content for
// /hairstyles and /hairstyles/[slug].
//
// About 100 popular cuts and styles from seven regions, half men's and half
// women's, including many Tressform's own list (hairstyles.ts) doesn't have.
// 26.10.2026: the owner's spreadsheet "Hairstyles - men and women.xlsx" was
// not in the project when this was written, so this first list was put
// together by hand; it should be checked against the spreadsheet.
//
// Each style has:
//   slug        its address: /hairstyles/<slug>
//   name, gender, region, country + 2-letter country code (ISO)
//   line        one plain sentence about it
//   length      for the card's tag (Very short, Short, Medium, Long, Very long)
//   best/avoid  face shapes it suits most (strongest first) / never shown for
//   cut         the style in a stylist's terms — what the image model is told
//               and what the barber card is built from
//   barber      the barber or stylist notes ("Label: text" points)
// plus what Tressform's picker needs to judge a fit (needs, texture, upkeep,
// family, effects; see hairstyles.ts for what each means).
//
// Every style can be tried on a customer's own face: they are turned into
// ordinary Hairstyle entries (worldAsHairstyles below), which
// lib/content/hairstyles.ts can look up by id ("world-<slug>"). The
// automatic "best for you" picker only shows one when it truly fits
// (lib/recommend.ts, worldStyleFits).
//
// The gallery pictures are made by the owner in /admin/studio ("World
// hairstyles – make pictures"): one model per region and gender (MODELS
// below) for the plain "before" photo, and that model with each style for the
// "after". imagePrompt is the whole picture described in one go.
//
// No celebrities and no lookalikes: no style or model is described by a
// famous person's name or look.

import type { FaceShape } from "@/lib/faceShape";
import type { HairGender, Hairstyle, StyleEffect, StyleNeeds, Upkeep } from "./hairstyles";

export const WORLD_REGIONS = ["india", "east-asia", "europe", "americas", "africa", "middle-east", "oceania"] as const;
export type WorldRegion = (typeof WORLD_REGIONS)[number];

export const REGION_LABEL: Record<WorldRegion, string> = {
  india: "India",
  "east-asia": "East Asia",
  europe: "Europe",
  americas: "Americas",
  africa: "Africa",
  "middle-east": "Middle East",
  oceania: "Oceania",
};

export type WorldLength = "Very short" | "Short" | "Medium" | "Long" | "Very long";

export interface WorldStyle {
  slug: string;
  name: string;
  gender: HairGender;
  region: WorldRegion;
  country: string;
  code: string;
  line: string;
  length: WorldLength;
  best: FaceShape[];
  avoid: FaceShape[];
  needs: StyleNeeds;
  /** [straight, wavy, curly]: 2 as it is, 1 with daily styling, 0 not offered. */
  texture: [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2];
  upkeep: Upkeep;
  family: string;
  effects: StyleEffect[];
  cut: string;
  barber: string[];
}

/**
 * The model for each region and gender — one person each, reused for every
 * style of that region, so the gallery's "before" and "after" are the same
 * face. Ordinary, invented people; never a famous person or a lookalike.
 * The East Asian models are used for the Korean, Japanese and Chinese styles.
 */
export const MODELS: Record<WorldRegion, Record<HairGender, string>> = {
  india: {
    men: "an Indian man in his late twenties with warm medium-brown skin, dark brown eyes and a neatly trimmed short beard",
    women: "an Indian woman in her late twenties with warm medium-brown skin and dark brown eyes",
  },
  "east-asia": {
    men: "a Korean man in his mid-twenties with light skin and dark brown eyes, clean-shaven",
    women: "a Korean woman in her mid-twenties with light skin and dark brown eyes",
  },
  europe: {
    men: "a European man in his late twenties with fair skin, hazel eyes and light stubble",
    women: "a European woman in her late twenties with fair skin and green-hazel eyes",
  },
  americas: {
    men: "a Latino man in his late twenties with medium-brown skin, dark brown eyes and light stubble",
    women: "a Latina woman in her late twenties with medium-brown skin and dark brown eyes",
  },
  africa: {
    men: "a West African man in his late twenties with deep brown skin and dark brown eyes, clean-shaven",
    women: "a West African woman in her late twenties with deep brown skin and dark brown eyes",
  },
  "middle-east": {
    men: "a Middle Eastern man in his late twenties with olive skin, dark brown eyes and a short neat beard",
    women: "a Middle Eastern woman in her late twenties with olive skin and dark brown eyes",
  },
  oceania: {
    men: "a Polynesian man in his late twenties with warm brown skin and dark brown eyes, clean-shaven",
    women: "a Polynesian woman in her late twenties with warm brown skin and dark brown eyes",
  },
};

const STUDIO =
  "Realistic head-and-shoulders photograph, facing the camera, relaxed natural expression, plain light-grey studio background, " +
  "soft even light, plain dark crew-neck top, natural skin texture, sharp focus on the hair. No text, logos, watermarks or other people.";

/** The plain "before" photo of a region's model (made once, reused for every style). */
export function modelPrompt(region: WorldRegion, gender: HairGender): string {
  const hair =
    gender === "men"
      ? "short, plain, natural dark hair, about 3 cm on top, simply combed, with no styling"
      : "plain natural dark hair of shoulder length, tucked behind the ears, with no styling";
  return `${MODELS[region][gender]}, with ${hair}. ${STUDIO}`;
}

/** The whole gallery picture in one prompt: the region's model wearing this style. */
export function imagePrompt(style: WorldStyle): string {
  return `${MODELS[style.region][style.gender]}, with ${style.cut}. ${STUDIO}`;
}

const M = "men" as const;
const W = "women" as const;

export const WORLD_STYLES: WorldStyle[] = [
  // ------------------------------------------------------------- India, men
  {
    slug: "army-cut", name: "Army cut", gender: M, region: "india", country: "India", code: "IN",
    line: "The no-fuss short cut half of India grows up with: even, neat and cool in the heat.",
    length: "Very short", best: ["Oval", "Square", "Long"], avoid: ["Round"], needs: "very-short",
    texture: [2, 2, 2], upkeep: "low", family: "clipper", effects: ["show-face", "sharp"],
    cut: "an army cut: hair on top about 1–1.5 cm, clipped evenly, with the sides and back taken shorter with a #2 guard and a clean, squared neckline",
    barber: ["Top: about 1–1.5 cm, clipper over comb", "Sides and back: #2 guard, blended into the top", "Neckline: squared and clean", "Best for: oval, square and long faces"],
  },
  {
    slug: "hard-part-fade", name: "Hard part fade", gender: M, region: "india", country: "India", code: "IN",
    line: "A razor-shaved parting line with a combed top and a high fade — sharp for weddings and office alike.",
    length: "Short", best: ["Square", "Oval", "Diamond"], avoid: [], needs: "medium",
    texture: [2, 2, 1], upkeep: "medium", family: "part", effects: ["sharp", "side-sweep"],
    cut: "a hard part fade: hair on top about 5–6 cm combed to one side from a thin razor-shaved parting line, with a high skin fade on the sides and back",
    barber: ["Top: 5–6 cm, combed to the side", "Part: a thin line shaved with a razor on the natural parting", "Sides: high skin fade", "Best for: square, oval and diamond faces"],
  },
  {
    slug: "college-fringe", name: "College fringe, low fade", gender: M, region: "india", country: "India", code: "IN",
    line: "A soft, textured fringe brushed forward over the forehead with a low fade — the campus favourite.",
    length: "Short", best: ["Long", "Oval", "Heart"], avoid: ["Round"], needs: "short",
    texture: [2, 2, 1], upkeep: "low", family: "crop", effects: ["fringe", "soft-texture"],
    cut: "a college fringe: textured hair on top about 4–5 cm brushed forward into a soft fringe that sits just above the eyebrows, with a low fade on the sides and back",
    barber: ["Top: 4–5 cm, point-cut for texture", "Fringe: brushed forward, ends just above the eyebrows", "Sides: low fade from #1", "Best for: long, oval and heart-shaped faces"],
  },
  {
    slug: "wedding-slick-back", name: "Wedding slick back", gender: M, region: "india", country: "India", code: "IN",
    line: "Glossy hair combed straight back with a tight taper: the groom's and the groomsmen's go-to.",
    length: "Medium", best: ["Oval", "Square", "Diamond"], avoid: ["Long"], needs: "medium",
    texture: [2, 2, 1], upkeep: "medium", family: "slick", effects: ["sharp"],
    cut: "a wedding slick back: hair on top about 6–8 cm combed straight back with a glossy finish, and a mid taper on the sides and back",
    barber: ["Top: 6–8 cm, kept long enough to comb back", "Sides: mid taper, scissor-blended", "Finish: pomade, combed straight back", "Best for: oval, square and diamond faces"],
  },
  {
    slug: "hero-wavy-flow", name: "Hero wavy flow", gender: M, region: "india", country: "India", code: "IN",
    line: "Medium-length waves swept back and to the side, with movement that looks good on screen and off.",
    length: "Medium", best: ["Square", "Oval", "Long"], avoid: [], needs: "medium-long",
    texture: [1, 2, 2], upkeep: "medium", family: "sweep", effects: ["soft-length", "soft-texture", "side-sweep"],
    cut: "a medium wavy flow: wavy hair about 8–10 cm on top and 5–6 cm at the sides, swept back and slightly to one side, falling softly over the ears",
    barber: ["Top: 8–10 cm, layered to keep the wave", "Sides: 5–6 cm, scissors only, over the ears", "Back: tapered to the collar", "Best for: square, oval and long faces"],
  },
  {
    slug: "long-curtains", name: "Long curtains", gender: M, region: "india", country: "India", code: "IN",
    line: "A centre parting with longer front pieces falling to each side, the nineties look back again.",
    length: "Medium", best: ["Oval", "Square", "Diamond"], avoid: ["Round"], needs: "medium-long",
    texture: [2, 2, 1], upkeep: "medium", family: "bangs", effects: ["fringe", "soft-length"],
    cut: "long curtains: hair about 10–12 cm at the front, parted in the centre and falling to each side to cheekbone level, with 5–6 cm at the sides and a soft tapered back",
    barber: ["Front: 10–12 cm, centre part, falls to the cheekbones", "Sides: 5–6 cm, scissor cut", "Back: soft taper", "Best for: oval, square and diamond faces"],
  },
  {
    slug: "line-design-quiff", name: "Quiff with a line design", gender: M, region: "india", country: "India", code: "IN",
    line: "A lifted quiff with one or two clean lines shaved into the faded side.",
    length: "Short", best: ["Round", "Oval", "Square"], avoid: ["Long"], needs: "medium",
    texture: [2, 2, 1], upkeep: "high", family: "quiff", effects: ["height", "sharp"],
    cut: "a quiff with a line design: hair on top about 5–7 cm lifted up and back at the front, a mid skin fade on the sides, and two thin parallel lines shaved into one side above the ear",
    barber: ["Top: 5–7 cm, lifted at the front", "Sides: mid skin fade", "Design: two thin lines shaved above one ear", "Best for: round, oval and square faces"],
  },
  {
    slug: "beard-fade-crop", name: "Beard fade crop", gender: M, region: "india", country: "India", code: "IN",
    line: "A short textured crop whose fade runs down into a neatly shaped beard.",
    length: "Short", best: ["Round", "Oval", "Heart"], avoid: [], needs: "short",
    texture: [2, 2, 2], upkeep: "medium", family: "crop", effects: ["low-top", "sharp"],
    cut: "a beard fade crop: textured hair on top about 3–4 cm pushed forward, a low fade on the sides that blends smoothly into a short, neatly shaped beard",
    barber: ["Top: 3–4 cm, textured, pushed forward", "Sides: low fade", "Beard: faded at the sideburns into a short shaped beard", "Best for: round, oval and heart-shaped faces"],
  },

  // ----------------------------------------------------------- India, women
  {
    slug: "gajra-braid", name: "Long braid with gajra", gender: W, region: "india", country: "India", code: "IN",
    line: "A single long plait down the back, wound with fresh jasmine — the festival and wedding classic.",
    length: "Very long", best: ["Oval", "Round", "Heart"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 1], upkeep: "medium", family: "long", effects: ["long-lines", "show-face"],
    cut: "a long braid with gajra: hair parted in the centre and smoothed back into one long three-strand plait down the back, with a string of white jasmine flowers wound around the top of the braid",
    barber: ["Part: centre, smooth to the scalp", "Braid: one three-strand plait from the nape", "Finish: a jasmine gajra pinned at the top of the braid", "Best for: oval, round and heart-shaped faces"],
  },
  {
    slug: "front-puff", name: "Front puff, open hair", gender: W, region: "india", country: "India", code: "IN",
    line: "A soft puff of height at the front, pinned back, with the rest left loose and flowing.",
    length: "Long", best: ["Round", "Square", "Oval"], avoid: ["Long"], needs: "shoulder",
    texture: [2, 2, 1], upkeep: "medium", family: "layers", effects: ["height", "long-lines"],
    cut: "a front puff with open hair: the front section backcombed into a soft raised puff about 4 cm high and pinned at the crown, with the rest of the hair left loose and smooth below the shoulders",
    barber: ["Front: backcomb gently, lift about 4 cm, pin at the crown", "Lengths: loose, smoothed with a round brush", "Best for: round, square and oval faces"],
  },
  {
    slug: "wedding-low-bun", name: "Wedding low bun", gender: W, region: "india", country: "India", code: "IN",
    line: "A smooth centre parting into a full, low bun at the nape — elegant under a dupatta.",
    length: "Long", best: ["Oval", "Heart", "Diamond"], avoid: [], needs: "shoulder",
    texture: [2, 2, 1], upkeep: "high", family: "classic", effects: ["show-face", "sharp"],
    cut: "a wedding low bun: hair parted in the centre, smoothed flat over the ears and gathered into a full, rounded bun low at the nape",
    barber: ["Part: centre, smooth and flat", "Bun: full and rounded, low at the nape", "Finish: light shine spray, no flyaways", "Best for: oval, heart-shaped and diamond faces"],
  },
  {
    slug: "fishtail-side-braid", name: "Fishtail side braid", gender: W, region: "india", country: "India", code: "IN",
    line: "A loose fishtail braid swept over one shoulder, a little undone for a soft finish.",
    length: "Long", best: ["Round", "Oval", "Square"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 1], upkeep: "medium", family: "long", effects: ["side-sweep", "soft-texture"],
    cut: "a fishtail side braid: hair gathered over one shoulder into a loose fishtail braid, gently pulled apart for texture, with a few soft face-framing strands left out at the front",
    barber: ["Gather: over one shoulder", "Braid: fishtail, loosened by hand", "Front: two soft strands left out", "Best for: round, oval and square faces"],
  },
  {
    slug: "face-framing-flicks", name: "Face-framing flicks", gender: W, region: "india", country: "India", code: "IN",
    line: "Long hair with front layers blow-dried to flick away from the face.",
    length: "Long", best: ["Round", "Square", "Heart"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 1], upkeep: "medium", family: "framing", effects: ["face-framing", "long-lines"],
    cut: "long hair with face-framing flicks: layers at the front starting at the chin, blow-dried to flick outward away from the face, with the lengths falling straight below the shoulders and no fringe",
    barber: ["Front: layers from chin level, keep your length", "Blow-dry: front pieces flicked outward", "No fringe", "Best for: round, square and heart-shaped faces"],
  },
  {
    slug: "bouncy-blowout", name: "Bouncy blow-out", gender: W, region: "india", country: "India", code: "IN",
    line: "Long layers blow-dried with a round brush for big, glossy bounce.",
    length: "Long", best: ["Long", "Oval", "Diamond"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 1], upkeep: "high", family: "layers", effects: ["side-volume", "soft-length"],
    cut: "a bouncy blow-out: long layered hair blow-dried with a large round brush so the ends curl softly under and out, with lots of volume at the roots and sides",
    barber: ["Cut: long layers, keep your length", "Blow-dry: big round brush, roots lifted", "Ends: curled softly under and out", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "layered-shoulder-cut", name: "Layered shoulder cut, side part", gender: W, region: "india", country: "India", code: "IN",
    line: "Shoulder-length hair with soft layers and a deep side parting.",
    length: "Medium", best: ["Round", "Oval", "Square"], avoid: [], needs: "shoulder",
    texture: [2, 2, 2], upkeep: "low", family: "layers", effects: ["side-sweep", "soft-length"],
    cut: "a layered shoulder cut: hair ending just at the shoulders with soft, blended layers and a deep side parting, the front sweeping across to one side",
    barber: ["Length: to the shoulders", "Layers: soft and blended", "Part: deep side part", "Best for: round, oval and square faces"],
  },
  {
    slug: "soft-side-waves", name: "Soft side-parted waves", gender: W, region: "india", country: "India", code: "IN",
    line: "Long hair in loose, polished waves from a side parting — the reception-night look.",
    length: "Long", best: ["Oval", "Heart", "Long"], avoid: [], needs: "below-shoulder",
    texture: [1, 2, 2], upkeep: "high", family: "long", effects: ["side-volume", "soft-texture"],
    cut: "soft side-parted waves: long hair parted deeply to one side, set in loose, polished waves from the cheekbones down to the ends",
    barber: ["Part: deep side part", "Waves: large curling iron, brushed out loose", "Keep your length", "Best for: oval, heart-shaped and long faces"],
  },

  // -------------------------------------------------------- East Asia, men
  {
    slug: "comma-hair", name: "Comma hair", gender: M, region: "east-asia", country: "South Korea", code: "KR",
    line: "A fringe that curls inward at one end like a comma, over neat, soft sides.",
    length: "Short", best: ["Long", "Oval", "Diamond"], avoid: [], needs: "medium",
    texture: [2, 2, 1], upkeep: "medium", family: "bangs", effects: ["fringe", "soft-texture"],
    cut: "comma hair: hair about 6–7 cm on top, the fringe swept to one side and curled inward at the end into a comma shape at the eyebrow, with soft scissor-cut sides about 2–3 cm",
    barber: ["Top: 6–7 cm, layered", "Fringe: swept to one side, ends curled inward", "Sides: 2–3 cm, scissors, no fade", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "shadow-perm", name: "Shadow perm", gender: M, region: "east-asia", country: "South Korea", code: "KR",
    line: "A soft, loose perm that gives straight hair gentle movement and shape.",
    length: "Medium", best: ["Square", "Long", "Oval"], avoid: [], needs: "medium",
    texture: [1, 2, 0], upkeep: "medium", family: "curly", effects: ["soft-texture", "fringe"],
    cut: "a shadow perm: hair about 6–8 cm on top with a loose, soft wave set through it, falling forward into a light fringe, with short scissor-cut sides",
    barber: ["Top: 6–8 cm, loose perm rods", "Fringe: soft, falls forward", "Sides: 2–3 cm, scissors", "Best for: square, long and oval faces"],
  },
  {
    slug: "dandy-cut", name: "Dandy cut", gender: M, region: "east-asia", country: "South Korea", code: "KR",
    line: "A full, rounded fringe brushed straight down, with neat sides: the classic Korean clean-cut look.",
    length: "Short", best: ["Long", "Oval", "Heart"], avoid: ["Round"], needs: "medium",
    texture: [2, 1, 0], upkeep: "low", family: "bangs", effects: ["fringe", "low-top"],
    cut: "a dandy cut: hair about 5–6 cm on top brushed down into a full, rounded fringe that sits at the eyebrows, with soft, short sides blended with scissors",
    barber: ["Top: 5–6 cm", "Fringe: full, rounded, at the eyebrows", "Sides: short, scissor-blended", "Best for: long, oval and heart-shaped faces"],
  },
  {
    slug: "mash-cut", name: "Mash cut", gender: M, region: "east-asia", country: "Japan", code: "JP",
    line: "A rounded, mushroom-like shape with a heavy fringe — Tokyo's long-running favourite.",
    length: "Medium", best: ["Long", "Diamond", "Oval"], avoid: ["Round"], needs: "medium",
    texture: [2, 1, 0], upkeep: "medium", family: "bangs", effects: ["fringe", "side-volume"],
    cut: "a mash cut: a rounded, mushroom-like shape with hair about 7–8 cm on top falling forward into a heavy fringe at the eyebrows, the sides covering the tops of the ears",
    barber: ["Shape: rounded all over", "Fringe: heavy, at the eyebrows", "Sides: over the tops of the ears", "Best for: long, diamond and oval faces"],
  },
  {
    slug: "mens-wolf-cut-japan", name: "Japanese wolf cut", gender: M, region: "east-asia", country: "Japan", code: "JP",
    line: "Choppy layers short on top and longer at the neck, with a shaggy, wild finish.",
    length: "Medium", best: ["Oval", "Square", "Heart"], avoid: [], needs: "medium-long",
    texture: [2, 2, 2], upkeep: "medium", family: "shag", effects: ["soft-texture", "soft-length", "fringe"],
    cut: "a Japanese wolf cut: choppy layers about 6–8 cm on top, a shaggy fringe, and longer pieces about 10–12 cm left at the nape",
    barber: ["Top: 6–8 cm, choppy layers", "Fringe: shaggy, uneven", "Nape: 10–12 cm left long", "Best for: oval, square and heart-shaped faces"],
  },
  {
    slug: "bozu-buzz", name: "Bozu buzz cut", gender: M, region: "east-asia", country: "Japan", code: "JP",
    line: "An even, very short buzz all over: clean, cool and quick.",
    length: "Very short", best: ["Oval", "Square", "Diamond"], avoid: ["Round", "Long"], needs: "very-short",
    texture: [2, 2, 2], upkeep: "low", family: "clipper", effects: ["show-face"],
    cut: "a bozu buzz cut: hair clipped evenly all over to about 6 mm, with a natural rounded hairline at the front",
    barber: ["All over: #2 guard (6 mm)", "Front hairline: natural, not lined up", "Best for: oval, square and diamond faces"],
  },
  {
    slug: "hong-kong-centre-part", name: "Hong Kong centre part", gender: M, region: "east-asia", country: "Hong Kong", code: "HK",
    line: "Long, straight hair parted in the middle and tucked behind the ears — straight out of 90s Hong Kong film.",
    length: "Medium", best: ["Oval", "Long", "Square"], avoid: ["Round"], needs: "medium-long",
    texture: [2, 1, 0], upkeep: "medium", family: "bangs", effects: ["fringe", "soft-length"],
    cut: "a Hong Kong centre part: straight hair about 10–12 cm at the front parted in the centre and falling to each side, long enough to tuck behind the ears, with the back reaching the collar",
    barber: ["Front: 10–12 cm, centre part", "Sides: long enough to tuck behind the ears", "Back: to the collar", "Best for: oval, long and square faces"],
  },
  {
    slug: "chinese-textured-fringe", name: "Short textured fringe", gender: M, region: "east-asia", country: "China", code: "CN",
    line: "A short, piecey fringe over a tapered back: tidy, light and easy.",
    length: "Short", best: ["Long", "Oval", "Heart"], avoid: [], needs: "short",
    texture: [2, 2, 1], upkeep: "low", family: "crop", effects: ["fringe", "low-top"],
    cut: "a short textured fringe: hair about 4 cm on top cut into a short, piecey fringe above the eyebrows, with a scissor taper on the sides and back",
    barber: ["Top: about 4 cm, point-cut", "Fringe: short and piecey", "Sides and back: scissor taper", "Best for: long, oval and heart-shaped faces"],
  },
  {
    slug: "spiral-perm", name: "Spiral perm", gender: M, region: "east-asia", country: "Japan", code: "JP",
    line: "Tight, springy perm curls on top with shorter sides — big texture on straight hair.",
    length: "Medium", best: ["Long", "Oval", "Square"], avoid: ["Round"], needs: "medium",
    texture: [1, 2, 2], upkeep: "medium", family: "curly", effects: ["height", "soft-texture"],
    cut: "a spiral perm: springy spiral curls about 6–7 cm on top, with a low taper on the sides and back",
    barber: ["Top: 6–7 cm, small spiral perm rods", "Sides: low taper", "Best for: long, oval and square faces"],
  },

  // ------------------------------------------------------ East Asia, women
  {
    slug: "hime-cut", name: "Hime cut", gender: W, region: "east-asia", country: "Japan", code: "JP",
    line: "Straight, blunt cheek-length side pieces and a full fringe over long hair: a cut with Japanese court roots.",
    length: "Long", best: ["Long", "Oval", "Diamond"], avoid: ["Round"], needs: "below-shoulder",
    texture: [2, 1, 0], upkeep: "medium", family: "bangs", effects: ["fringe", "face-framing", "long-lines"],
    cut: "a hime cut: long straight hair with a blunt full fringe at the eyebrows and blunt side sections cut straight across at cheek level, the rest falling straight below the shoulders",
    barber: ["Fringe: blunt, at the eyebrows", "Side pieces: cut straight across at the cheekbones", "Lengths: kept long and straight", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "hush-cut", name: "Hush cut", gender: W, region: "east-asia", country: "South Korea", code: "KR",
    line: "Soft, airy layers around the face with see-through bangs — light and effortless.",
    length: "Medium", best: ["Round", "Square", "Oval"], avoid: [], needs: "shoulder",
    texture: [2, 2, 1], upkeep: "low", family: "shag", effects: ["face-framing", "soft-texture", "fringe"],
    cut: "a hush cut: shoulder-length hair with soft, airy layers around the face and crown, thin see-through bangs, and lightly feathered ends",
    barber: ["Length: around the shoulders", "Layers: soft, airy, face-framing", "Bangs: thin, see-through", "Best for: round, square and oval faces"],
  },
  {
    slug: "c-curl-bob", name: "C-curl bob", gender: W, region: "east-asia", country: "South Korea", code: "KR",
    line: "A chin-to-jaw bob whose ends curve softly under into a C.",
    length: "Short", best: ["Oval", "Heart", "Long"], avoid: [], needs: "chin",
    texture: [2, 1, 0], upkeep: "medium", family: "bob", effects: ["width-low"],
    cut: "a C-curl bob: a smooth bob ending at the jaw, the ends curved softly under in a C shape, with a side part and no fringe",
    barber: ["Length: at the jaw", "Ends: curved under (C-curl perm or round brush)", "No fringe, side part", "Best for: oval, heart-shaped and long faces"],
  },
  {
    slug: "s-curl-perm", name: "S-curl perm", gender: W, region: "east-asia", country: "South Korea", code: "KR",
    line: "Long hair with loose, flowing S-shaped waves from the mid-lengths down.",
    length: "Long", best: ["Long", "Oval", "Square"], avoid: [], needs: "below-shoulder",
    texture: [1, 2, 1], upkeep: "low", family: "long", effects: ["side-volume", "soft-texture"],
    cut: "an S-curl perm: long hair with loose, flowing S-shaped waves starting from the mid-lengths, smooth at the roots, with soft face-framing layers",
    barber: ["Perm: loose S-curl from the mid-lengths", "Roots: left smooth", "Front: soft face-framing layers", "Best for: long, oval and square faces"],
  },
  {
    slug: "jellyfish-cut", name: "Jellyfish cut", gender: W, region: "east-asia", country: "Japan", code: "JP",
    line: "A short, blunt bob on top over longer, straight lengths underneath — bold and graphic.",
    length: "Long", best: ["Oval", "Long", "Diamond"], avoid: ["Round"], needs: "below-shoulder",
    texture: [2, 0, 0], upkeep: "high", family: "bob", effects: ["sharp", "long-lines", "fringe"],
    cut: "a jellyfish cut: a short blunt bob layer cut at chin level over the top section, with a blunt fringe, and long straight hair left underneath falling below the shoulders",
    barber: ["Top layer: blunt bob at chin level", "Under layer: long, straight, keep your length", "Fringe: blunt", "Best for: oval, long and diamond faces"],
  },
  {
    slug: "japanese-bob", name: "Japanese bob with heavy fringe", gender: W, region: "east-asia", country: "Japan", code: "JP",
    line: "A rounded, chin-length bob with a thick fringe and a soft inward curve.",
    length: "Short", best: ["Long", "Oval", "Heart"], avoid: ["Round"], needs: "chin",
    texture: [2, 1, 0], upkeep: "medium", family: "bob", effects: ["fringe", "width-low"],
    cut: "a Japanese bob: a rounded bob ending at the chin with a thick fringe at the eyebrows and ends curving softly inward",
    barber: ["Length: at the chin", "Fringe: thick, at the eyebrows", "Shape: rounded, ends turned in", "Best for: long, oval and heart-shaped faces"],
  },
  {
    slug: "air-bangs-long", name: "Long hair with air bangs", gender: W, region: "east-asia", country: "China", code: "CN",
    line: "Long straight hair with wispy, feather-light bangs you can see through.",
    length: "Long", best: ["Long", "Oval", "Heart"], avoid: [], needs: "below-shoulder",
    texture: [2, 1, 0], upkeep: "low", family: "bangs", effects: ["fringe", "long-lines"],
    cut: "long hair with air bangs: long straight hair with a very light, wispy see-through fringe falling to the eyebrows, and the lengths falling straight below the shoulders",
    barber: ["Bangs: very thin and wispy, at the eyebrows", "Lengths: keep your length, ends trimmed", "Best for: long, oval and heart-shaped faces"],
  },
  {
    slug: "high-ponytail-bangs", name: "High ponytail with bangs", gender: W, region: "east-asia", country: "China", code: "CN",
    line: "A sleek high ponytail and soft bangs — sporty and youthful.",
    length: "Long", best: ["Oval", "Heart", "Long"], avoid: [], needs: "shoulder",
    texture: [2, 2, 1], upkeep: "low", family: "long", effects: ["height", "fringe"],
    cut: "a high ponytail with bangs: hair smoothed back into a high ponytail at the crown, with a soft fringe at the eyebrows and two thin strands left out at the temples",
    barber: ["Ponytail: high, at the crown", "Fringe: soft, at the eyebrows", "Front: two thin strands left out", "Best for: oval, heart-shaped and long faces"],
  },
  {
    slug: "hong-kong-feathered-blowout", name: "90s feathered blow-out", gender: W, region: "east-asia", country: "Hong Kong", code: "HK",
    line: "Shoulder-length layers feathered back off the face with big, soft volume.",
    length: "Medium", best: ["Square", "Round", "Oval"], avoid: [], needs: "shoulder",
    texture: [2, 2, 1], upkeep: "high", family: "layers", effects: ["side-volume", "face-framing"],
    cut: "a 90s feathered blow-out: shoulder-length layered hair blow-dried back and away from the face in soft feathered layers with full volume at the crown and sides",
    barber: ["Length: around the shoulders", "Layers: feathered, face-framing", "Blow-dry: away from the face, full volume", "Best for: square, round and oval faces"],
  },

  // ----------------------------------------------------------- Europe, men
  {
    slug: "caesar-cut", name: "Caesar cut", gender: M, region: "europe", country: "Italy", code: "IT",
    line: "A short, even cut with a straight, short fringe brushed forward — an ancient Roman shape that never left.",
    length: "Short", best: ["Long", "Oval", "Diamond"], avoid: ["Round"], needs: "short",
    texture: [2, 2, 1], upkeep: "low", family: "crop", effects: ["fringe", "low-top"],
    cut: "a Caesar cut: hair about 2–3 cm all over on top brushed forward into a short, straight fringe cut horizontally across the forehead, with short tapered sides",
    barber: ["Top: 2–3 cm, brushed forward", "Fringe: short, cut straight across", "Sides: short taper", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "mod-cut", name: "Mod cut", gender: M, region: "europe", country: "United Kingdom", code: "GB",
    line: "A 60s London shape: a full fringe and hair covering the tops of the ears.",
    length: "Medium", best: ["Long", "Oval", "Square"], avoid: ["Round"], needs: "medium-long",
    texture: [2, 1, 0], upkeep: "medium", family: "bangs", effects: ["fringe", "soft-length"],
    cut: "a mod cut: hair about 8–10 cm on top falling forward into a full fringe at the eyebrows, the sides covering the tops of the ears, and the back to the collar",
    barber: ["Top: 8–10 cm, falls forward", "Fringe: full, at the eyebrows", "Sides: over the tops of the ears", "Back: to the collar", "Best for: long, oval and square faces"],
  },
  {
    slug: "disconnected-undercut", name: "Disconnected undercut", gender: M, region: "europe", country: "Germany", code: "DE",
    line: "Long hair on top over sides clipped short, with no blending between them.",
    length: "Medium", best: ["Oval", "Square", "Round"], avoid: ["Long"], needs: "medium-long",
    texture: [2, 2, 1], upkeep: "medium", family: "slick", effects: ["sharp", "height"],
    cut: "a disconnected undercut: hair about 10–12 cm on top swept back and to the side, with the sides and back clipped to about 6 mm and a sharp line where they meet, not blended",
    barber: ["Top: 10–12 cm", "Sides and back: #2 guard (6 mm)", "Join: a sharp line, not blended", "Best for: oval, square and round faces"],
  },
  {
    slug: "scandi-flow", name: "Scandinavian flow", gender: M, region: "europe", country: "Sweden", code: "SE",
    line: "Longer hair pushed back loosely, ends falling behind the ears — relaxed and natural.",
    length: "Long", best: ["Oval", "Square", "Diamond"], avoid: ["Round"], needs: "long",
    texture: [2, 2, 1], upkeep: "low", family: "long", effects: ["soft-length", "show-face"],
    cut: "a Scandinavian flow: hair about 12–15 cm pushed loosely back from the forehead, the ends falling behind the ears to just above the collar, with a natural matte finish",
    barber: ["Length: 12–15 cm all through", "Shape: pushed back, behind the ears", "Back: just above the collar", "Best for: oval, square and diamond faces"],
  },
  {
    slug: "greek-curls", name: "Greek curls", gender: M, region: "europe", country: "Greece", code: "GR",
    line: "Short, dense curls cut into a rounded shape close to the head.",
    length: "Short", best: ["Long", "Oval", "Square"], avoid: [], needs: "short",
    texture: [0, 1, 2], upkeep: "low", family: "curly", effects: ["soft-texture"],
    cut: "Greek curls: dense natural curls about 3–4 cm cut into a rounded shape close to the head, slightly shorter at the sides and nape",
    barber: ["Top: 3–4 cm, curls cut dry", "Sides and nape: slightly shorter", "Shape: rounded, close to the head", "Best for: long, oval and square faces"],
  },
  {
    slug: "parisian-tousled-part", name: "Parisian tousled side part", gender: M, region: "europe", country: "France", code: "FR",
    line: "A soft side part left a little messy, as if styled with the fingers.",
    length: "Medium", best: ["Square", "Oval", "Round"], avoid: [], needs: "medium",
    texture: [2, 2, 1], upkeep: "low", family: "part", effects: ["side-sweep", "soft-texture"],
    cut: "a Parisian tousled side part: hair about 6–7 cm on top loosely parted to one side and tousled with the fingers, with scissor-cut sides about 3 cm",
    barber: ["Top: 6–7 cm, textured", "Part: soft, off-centre", "Sides: scissors, about 3 cm", "Best for: square, oval and round faces"],
  },
  {
    slug: "spanish-faded-curls", name: "Faded curly top", gender: M, region: "europe", country: "Spain", code: "ES",
    line: "Loose curls left full on top over a high fade.",
    length: "Short", best: ["Round", "Oval", "Square"], avoid: [], needs: "medium",
    texture: [0, 2, 2], upkeep: "medium", family: "curly", effects: ["height", "soft-texture"],
    cut: "a faded curly top: loose curls about 5–7 cm on top, full and natural, with a high skin fade on the sides and back",
    barber: ["Top: 5–7 cm, curls cut dry", "Sides: high skin fade", "Best for: round, oval and square faces"],
  },
  {
    slug: "danish-textured-crew", name: "Textured crew cut", gender: M, region: "europe", country: "Denmark", code: "DK",
    line: "A short crew cut with a little extra length and texture at the front.",
    length: "Short", best: ["Oval", "Square", "Long"], avoid: [], needs: "short",
    texture: [2, 2, 2], upkeep: "low", family: "crop", effects: ["sharp", "low-top"],
    cut: "a textured crew cut: hair about 3 cm at the front graduating to 2 cm at the crown, lightly textured and pushed up at the front, with short tapered sides",
    barber: ["Front: about 3 cm, textured", "Crown: about 2 cm", "Sides: short taper", "Best for: oval, square and long faces"],
  },
  {
    slug: "italian-pompadour", name: "Italian side-swept pompadour", gender: M, region: "europe", country: "Italy", code: "IT",
    line: "Full volume swept up and to one side, with tidy tapered sides.",
    length: "Medium", best: ["Round", "Oval", "Square"], avoid: ["Long"], needs: "medium-long",
    texture: [2, 2, 1], upkeep: "high", family: "quiff", effects: ["height", "side-sweep"],
    cut: "an Italian side-swept pompadour: hair about 8–10 cm on top blow-dried up and swept to one side with full volume at the front, and a scissor taper on the sides",
    barber: ["Top: 8–10 cm", "Blow-dry: up and to one side", "Sides: scissor taper", "Best for: round, oval and square faces"],
  },

  // --------------------------------------------------------- Europe, women
  {
    slug: "london-pixie", name: "London pixie", gender: W, region: "europe", country: "United Kingdom", code: "GB",
    line: "A short, cropped pixie with a soft, side-swept fringe.",
    length: "Very short", best: ["Oval", "Heart", "Diamond"], avoid: ["Round", "Long"], needs: "ear",
    texture: [2, 2, 1], upkeep: "medium", family: "pixie", effects: ["show-face", "side-sweep"],
    cut: "a London pixie: a short cropped pixie about 2–3 cm at the sides and back and 5–6 cm on top, with a soft side-swept fringe",
    barber: ["Sides and back: 2–3 cm", "Top: 5–6 cm", "Fringe: side-swept", "Best for: oval, heart-shaped and diamond faces"],
  },
  {
    slug: "shaggy-mullet", name: "Shaggy mullet", gender: W, region: "europe", country: "United Kingdom", code: "GB",
    line: "Choppy, short layers on top and around the face with longer lengths at the back.",
    length: "Medium", best: ["Oval", "Square", "Heart"], avoid: [], needs: "shoulder",
    texture: [2, 2, 2], upkeep: "medium", family: "shag", effects: ["fringe", "soft-texture", "soft-length"],
    cut: "a shaggy mullet: choppy short layers on top and around the face with a messy fringe, and longer lengths at the back reaching the shoulders",
    barber: ["Top: short, choppy layers", "Fringe: messy, at the eyebrows", "Back: longer, to the shoulders", "Best for: oval, square and heart-shaped faces"],
  },
  {
    slug: "italian-bob", name: "Italian bob", gender: W, region: "europe", country: "Italy", code: "IT",
    line: "A full, jaw-length bob with soft volume and a relaxed, swingy finish.",
    length: "Short", best: ["Oval", "Long", "Heart"], avoid: [], needs: "chin",
    texture: [2, 2, 1], upkeep: "medium", family: "bob", effects: ["width-low", "side-volume"],
    cut: "an Italian bob: a full, thick bob ending just below the jaw with soft volume, a slightly off-centre part and ends that swing gently outward",
    barber: ["Length: just below the jaw", "Shape: full and thick, light layering inside", "Part: slightly off-centre", "Best for: oval, long and heart-shaped faces"],
  },
  {
    slug: "parisian-bob", name: "Parisian bob with bangs", gender: W, region: "europe", country: "France", code: "FR",
    line: "A short, slightly undone bob at the cheekbones with a wispy fringe.",
    length: "Short", best: ["Oval", "Long", "Heart"], avoid: ["Round"], needs: "ear",
    texture: [2, 2, 1], upkeep: "low", family: "bob", effects: ["fringe", "soft-texture"],
    cut: "a Parisian bob: a short bob ending between the cheekbones and the chin, slightly undone and textured, with a wispy fringe at the eyebrows",
    barber: ["Length: between cheekbone and chin", "Texture: point-cut, a little undone", "Fringe: wispy, at the eyebrows", "Best for: oval, long and heart-shaped faces"],
  },
  {
    slug: "sixties-bouffant", name: "60s bouffant with curtain bangs", gender: W, region: "europe", country: "France", code: "FR",
    line: "Lifted volume at the crown, long curtain bangs and loose lengths — a 60s French look.",
    length: "Long", best: ["Round", "Square", "Oval"], avoid: ["Long"], needs: "below-shoulder",
    texture: [2, 2, 1], upkeep: "high", family: "bangs", effects: ["height", "fringe"],
    cut: "a 60s bouffant with curtain bangs: volume backcombed at the crown, long curtain bangs parted in the centre sweeping to each side, and the lengths loose below the shoulders",
    barber: ["Crown: backcombed for lift", "Bangs: long curtain bangs, centre part", "Lengths: keep your length", "Best for: round, square and oval faces"],
  },
  {
    slug: "spanish-curls", name: "Long Spanish curls", gender: W, region: "europe", country: "Spain", code: "ES",
    line: "Long, defined curls with lots of volume, layered so they sit round and full.",
    length: "Long", best: ["Long", "Oval", "Diamond"], avoid: [], needs: "below-shoulder",
    texture: [0, 2, 2], upkeep: "medium", family: "curly", effects: ["side-volume", "soft-texture"],
    cut: "long Spanish curls: long, defined curls below the shoulders with layers cut so they stack into a full, rounded shape, with a centre part",
    barber: ["Cut: curly layers, cut dry curl by curl", "Length: keep your length", "Part: centre", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "greek-braid-crown", name: "Greek braid crown", gender: W, region: "europe", country: "Greece", code: "GR",
    line: "A braid wrapped around the head like a crown, with soft strands left at the face.",
    length: "Long", best: ["Oval", "Long", "Heart"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 2], upkeep: "medium", family: "long", effects: ["show-face", "soft-texture"],
    cut: "a Greek braid crown: long hair braided and wrapped around the head like a crown, pinned in place, with a few soft wavy strands left out around the face",
    barber: ["Braid: from one side, wrapped around the head", "Pin: hidden pins, crown shape", "Front: a few soft strands left out", "Best for: oval, long and heart-shaped faces"],
  },
  {
    slug: "dutch-braids", name: "Dutch braids", gender: W, region: "europe", country: "Netherlands", code: "NL",
    line: "Two raised braids running from the forehead to the nape — neat and sporty.",
    length: "Long", best: ["Oval", "Heart", "Diamond"], avoid: [], needs: "shoulder",
    texture: [2, 2, 2], upkeep: "medium", family: "long", effects: ["show-face", "sharp"],
    cut: "Dutch braids: hair parted in the centre and woven into two raised braids that run from the forehead down to the nape and hang over the shoulders",
    barber: ["Part: centre, clean", "Braids: two Dutch (inverted) braids, tight to the scalp", "Ends: over the shoulders", "Best for: oval, heart-shaped and diamond faces"],
  },
  {
    slug: "scandi-blunt-lob", name: "Scandi blunt lob", gender: W, region: "europe", country: "Sweden", code: "SE",
    line: "A sleek, one-length lob at the collarbone with a clean middle part.",
    length: "Medium", best: ["Round", "Oval", "Square"], avoid: [], needs: "shoulder",
    texture: [2, 1, 0], upkeep: "low", family: "lob", effects: ["long-lines", "width-low"],
    cut: "a Scandi blunt lob: sleek straight hair cut in one blunt length at the collarbone, with a clean middle part and no layers or fringe",
    barber: ["Length: at the collarbone, one blunt line", "No layers, no fringe", "Part: centre", "Best for: round, oval and square faces"],
  },

  // --------------------------------------------------------- Americas, men
  {
    slug: "high-top-fade", name: "High-top fade", gender: M, region: "americas", country: "United States", code: "US",
    line: "Tall, flat-topped hair over sides faded to the skin — a classic from 80s and 90s New York.",
    length: "Medium", best: ["Round", "Oval", "Square"], avoid: ["Long"], needs: "medium-long",
    texture: [0, 1, 2], upkeep: "high", family: "back-shape", effects: ["height", "sharp"],
    cut: "a high-top fade: tightly coiled hair shaped into a tall, flat-topped block about 8–10 cm high, with the sides and back faded to the skin",
    barber: ["Top: 8–10 cm, shaped flat with clippers", "Sides: high skin fade", "Line-up: crisp at the front", "Best for: round, oval and square faces"],
  },
  {
    slug: "360-waves", name: "360 waves", gender: M, region: "americas", country: "United States", code: "US",
    line: "Short, brushed hair that forms rippling waves all around the head.",
    length: "Very short", best: ["Oval", "Square", "Diamond"], avoid: [], needs: "very-short",
    texture: [0, 0, 2], upkeep: "high", family: "clipper", effects: ["show-face", "sharp"],
    cut: "360 waves: short coily hair about 1 cm brushed into tight rippling waves that circle the whole head from the crown, with a sharp line-up at the front",
    barber: ["All over: about 1 cm, cut with the grain", "Line-up: sharp at the front and temples", "Waves: brushed daily from the crown", "Best for: oval, square and diamond faces"],
  },
  {
    slug: "sponge-twists", name: "Sponge twists, taper", gender: M, region: "americas", country: "United States", code: "US",
    line: "Small, springy twists on top with a clean taper at the sides.",
    length: "Short", best: ["Oval", "Round", "Long"], avoid: [], needs: "short",
    texture: [0, 0, 2], upkeep: "medium", family: "curly", effects: ["height", "soft-texture"],
    cut: "sponge twists with a taper: coily hair about 4–5 cm on top formed into small, springy twists, with a low taper on the sides and back",
    barber: ["Top: 4–5 cm, twisted with a sponge", "Sides: low taper", "Line-up: soft", "Best for: oval, round and long faces"],
  },
  {
    slug: "edgar-cut", name: "Edgar cut", gender: M, region: "americas", country: "Mexico", code: "MX",
    line: "A blunt, straight-across fringe over a high fade: bold, sharp and very current.",
    length: "Short", best: ["Long", "Oval", "Diamond"], avoid: ["Round"], needs: "short",
    texture: [2, 2, 1], upkeep: "high", family: "crop", effects: ["fringe", "sharp"],
    cut: "an Edgar cut: hair about 3–4 cm on top brushed forward into a blunt fringe cut dead straight across the forehead, with a high skin fade on the sides and back",
    barber: ["Top: 3–4 cm, brushed forward", "Fringe: blunt, straight across", "Sides: high skin fade", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "brazilian-low-fade-design", name: "Low fade with a design", gender: M, region: "americas", country: "Brazil", code: "BR",
    line: "A crisp low fade with a curved line design cut into the side.",
    length: "Short", best: ["Oval", "Round", "Square"], avoid: [], needs: "short",
    texture: [2, 2, 2], upkeep: "high", family: "crop", effects: ["sharp", "low-top"],
    cut: "a low fade with a design: textured hair about 3 cm on top, a low skin fade on the sides and back, and a thin curved line design shaved into one side",
    barber: ["Top: about 3 cm, textured", "Sides: low skin fade", "Design: a thin curved line on one side", "Best for: oval, round and square faces"],
  },
  {
    slug: "argentine-melena", name: "Argentine melena", gender: M, region: "americas", country: "Argentina", code: "AR",
    line: "Shoulder-length, loose, wavy hair worn free — the footballer-and-musician look.",
    length: "Long", best: ["Oval", "Square", "Long"], avoid: ["Round"], needs: "long",
    texture: [2, 2, 1], upkeep: "low", family: "long", effects: ["soft-length", "soft-texture"],
    cut: "an Argentine melena: loose, slightly wavy hair grown to the shoulders, parted off-centre and tucked behind one ear, with light layers at the ends",
    barber: ["Length: to the shoulders", "Layers: light, at the ends only", "Part: off-centre", "Best for: oval, square and long faces"],
  },
  {
    slug: "jamaican-locs", name: "Shoulder-length locs", gender: M, region: "americas", country: "Jamaica", code: "JM",
    line: "Neat, medium-thick locs falling to the shoulders.",
    length: "Long", best: ["Oval", "Long", "Square"], avoid: [], needs: "long",
    texture: [0, 0, 2], upkeep: "medium", family: "locs", effects: ["soft-length", "long-lines"],
    cut: "shoulder-length locs: neat, medium-thick locs about 20 cm long falling to the shoulders, with a tidy hairline",
    barber: ["Locs: medium-thick, retwisted at the roots", "Length: to the shoulders", "Hairline: tidy", "Best for: oval, long and square faces"],
  },
  {
    slug: "hockey-flow", name: "Hockey flow", gender: M, region: "americas", country: "Canada", code: "CA",
    line: "Hair long enough to flow out from under a helmet, curling at the neck.",
    length: "Long", best: ["Oval", "Square", "Diamond"], avoid: ["Round"], needs: "long",
    texture: [2, 2, 1], upkeep: "low", family: "long", effects: ["soft-length"],
    cut: "a hockey flow: hair about 12–14 cm swept back from the forehead, with the ends curling out at the back of the neck below the ears",
    barber: ["Top: 12–14 cm, swept back", "Back: longer, ends curling out at the neck", "Sides: behind the ears", "Best for: oval, square and diamond faces"],
  },

  // ------------------------------------------------------- Americas, women
  {
    slug: "silk-press", name: "Silk press", gender: W, region: "americas", country: "United States", code: "US",
    line: "Natural hair pressed bone-straight and glossy, with swing and movement.",
    length: "Long", best: ["Round", "Oval", "Square"], avoid: [], needs: "shoulder",
    texture: [1, 1, 1], upkeep: "high", family: "long", effects: ["long-lines"],
    cut: "a silk press: natural hair pressed bone-straight and glossy, falling below the shoulders with a centre part and ends that swing",
    barber: ["Wash and blow-dry first", "Press: flat iron, small sections, heat protectant", "Part: centre", "Best for: round, oval and square faces"],
  },
  {
    slug: "knotless-braids", name: "Knotless box braids", gender: W, region: "americas", country: "United States", code: "US",
    line: "Long, medium-sized braids that start flat at the root for a light, natural look.",
    length: "Very long", best: ["Oval", "Heart", "Round"], avoid: [], needs: "chin",
    texture: [1, 1, 2], upkeep: "low", family: "braids", effects: ["long-lines", "show-face"],
    cut: "knotless box braids: medium-sized braids starting flat at the root with no knot, in neat square parts, falling to the mid-back",
    barber: ["Parts: neat squares", "Braids: knotless, medium size", "Length: to the mid-back (with extensions)", "Best for: oval, heart-shaped and round faces"],
  },
  {
    slug: "nineties-blowout", name: "90s blow-out", gender: W, region: "americas", country: "United States", code: "US",
    line: "Big, bouncy, face-framing layers blow-dried away from the face.",
    length: "Long", best: ["Square", "Long", "Oval"], avoid: [], needs: "shoulder",
    texture: [2, 2, 1], upkeep: "high", family: "layers", effects: ["side-volume", "face-framing"],
    cut: "a 90s blow-out: long layered hair with face-framing pieces starting at the chin, blow-dried with a large round brush into big, bouncy volume that flicks away from the face",
    barber: ["Layers: face-framing from the chin", "Blow-dry: big round brush, away from the face", "Best for: square, long and oval faces"],
  },
  {
    slug: "brazilian-long-layers", name: "Brazilian long layers", gender: W, region: "americas", country: "Brazil", code: "BR",
    line: "Long, smooth, glossy hair with gentle layers and soft movement at the ends.",
    length: "Very long", best: ["Round", "Oval", "Square"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 1], upkeep: "medium", family: "long", effects: ["long-lines", "soft-length"],
    cut: "Brazilian long layers: long, smooth, glossy hair falling well past the shoulders, with gentle long layers and soft movement at the ends, no fringe",
    barber: ["Layers: long and gentle, keep your length", "Finish: smooth and glossy", "No fringe", "Best for: round, oval and square faces"],
  },
  {
    slug: "mexican-crown-braids", name: "Crown braids with flowers", gender: W, region: "americas", country: "Mexico", code: "MX",
    line: "Two braids wrapped over the head like a crown, finished with bright flowers.",
    length: "Long", best: ["Oval", "Long", "Heart"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 2], upkeep: "medium", family: "long", effects: ["show-face", "height"],
    cut: "crown braids with flowers: hair parted in the centre into two braids wrapped up and over the top of the head like a crown, with a few bright fabric flowers pinned at one side",
    barber: ["Part: centre", "Braids: two, wrapped over the crown and pinned", "Finish: flowers pinned at one side", "Best for: oval, long and heart-shaped faces"],
  },
  {
    slug: "colombian-volume", name: "Colombian voluminous layers", gender: W, region: "americas", country: "Colombia", code: "CO",
    line: "Long, full layers with bouncy curls at the ends and lots of root lift.",
    length: "Long", best: ["Long", "Oval", "Diamond"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 2], upkeep: "high", family: "layers", effects: ["side-volume", "soft-texture"],
    cut: "Colombian voluminous layers: long layered hair with lots of lift at the roots and bouncy curls set through the ends, parted to one side",
    barber: ["Layers: long, keep your length", "Roots: lifted with a round brush", "Ends: bouncy curls", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "peruvian-trenzas", name: "Peruvian trenzas", gender: W, region: "americas", country: "Peru", code: "PE",
    line: "Two long braids from a centre part, the Andean classic.",
    length: "Very long", best: ["Oval", "Round", "Heart"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 1], upkeep: "low", family: "long", effects: ["long-lines", "show-face"],
    cut: "Peruvian trenzas: long hair parted in the centre into two long three-strand braids that start behind the ears and hang down over the front of the shoulders",
    barber: ["Part: centre", "Braids: two, starting behind the ears", "Ends: over the front of the shoulders", "Best for: oval, round and heart-shaped faces"],
  },
  {
    slug: "curly-shag", name: "Curly shag", gender: W, region: "americas", country: "Puerto Rico", code: "PR",
    line: "Curls cut in short, stacked layers with a curly fringe — big shape, little effort.",
    length: "Medium", best: ["Oval", "Long", "Heart"], avoid: [], needs: "shoulder",
    texture: [0, 2, 2], upkeep: "low", family: "shag", effects: ["fringe", "side-volume", "soft-texture"],
    cut: "a curly shag: curly hair cut in short, stacked layers around the crown and face with a curly fringe, the lengths reaching the shoulders",
    barber: ["Cut: dry, curl by curl", "Layers: short and stacked at the crown", "Fringe: curly", "Best for: oval, long and heart-shaped faces"],
  },

  // ----------------------------------------------------------- Africa, men
  {
    slug: "nigerian-low-cut", name: "Low cut with sharp line-up", gender: M, region: "africa", country: "Nigeria", code: "NG",
    line: "Very short, even hair with a razor-sharp hairline: the everyday Lagos barbershop cut.",
    length: "Very short", best: ["Oval", "Square", "Diamond"], avoid: [], needs: "very-short",
    texture: [2, 2, 2], upkeep: "medium", family: "clipper", effects: ["show-face", "sharp"],
    cut: "a low cut with a sharp line-up: hair clipped evenly to about 4–6 mm all over, with a crisp razor line-up at the forehead, temples and beard line",
    barber: ["All over: #1 to #2 guard", "Line-up: razor-sharp at the forehead and temples", "Best for: oval, square and diamond faces"],
  },
  {
    slug: "gofere-afro", name: "Gofere afro", gender: M, region: "africa", country: "Ethiopia", code: "ET",
    line: "A full, rounded afro picked out for height and shape.",
    length: "Long", best: ["Long", "Oval", "Diamond"], avoid: ["Round"], needs: "long",
    texture: [0, 0, 2], upkeep: "medium", family: "curly", effects: ["height", "side-volume", "soft-texture"],
    cut: "a gofere afro: tightly coiled hair about 10–12 cm picked out into a full, rounded afro shape with a neat hairline",
    barber: ["Length: 10–12 cm all over", "Shape: rounded, cut after picking out", "Hairline: neat", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "short-twists", name: "Short two-strand twists", gender: M, region: "africa", country: "Kenya", code: "KE",
    line: "Neat two-strand twists about finger-length, with tapered sides.",
    length: "Short", best: ["Oval", "Long", "Square"], avoid: [], needs: "medium",
    texture: [0, 0, 2], upkeep: "medium", family: "curly", effects: ["height", "soft-texture"],
    cut: "short two-strand twists: coily hair about 5–6 cm on top in neat two-strand twists, with a low taper on the sides",
    barber: ["Top: 5–6 cm, two-strand twists", "Sides: low taper", "Best for: oval, long and square faces"],
  },
  {
    slug: "taper-with-part", name: "Taper with a side part line", gender: M, region: "africa", country: "South Africa", code: "ZA",
    line: "A short, even top with a shaved side part and a clean taper — smart and simple.",
    length: "Very short", best: ["Round", "Oval", "Square"], avoid: [], needs: "short",
    texture: [1, 1, 2], upkeep: "medium", family: "part", effects: ["sharp", "side-sweep"],
    cut: "a taper with a side part line: short coily hair about 1.5–2 cm on top, a razor-shaved side part line, and a low taper on the sides and back",
    barber: ["Top: 1.5–2 cm", "Part: shaved with a razor", "Sides: low taper", "Best for: round, oval and square faces"],
  },
  {
    slug: "starter-locs", name: "Starter locs", gender: M, region: "africa", country: "Senegal", code: "SN",
    line: "Short, neat new locs, evenly parted, with tapered sides.",
    length: "Short", best: ["Oval", "Square", "Long"], avoid: [], needs: "medium",
    texture: [0, 0, 2], upkeep: "medium", family: "locs", effects: ["soft-texture", "height"],
    cut: "starter locs: short new locs about 6–8 cm on top, evenly parted in small squares, with a low taper on the sides",
    barber: ["Top: 6–8 cm, coils or comb twists", "Parts: small, even squares", "Sides: low taper", "Best for: oval, square and long faces"],
  },
  {
    slug: "cornrow-design", name: "Cornrows with a design", gender: M, region: "africa", country: "Ghana", code: "GH",
    line: "Neat cornrows braided back in a curved pattern.",
    length: "Medium", best: ["Oval", "Long", "Diamond"], avoid: [], needs: "medium-long",
    texture: [0, 1, 2], upkeep: "low", family: "braids", effects: ["sharp", "show-face"],
    cut: "cornrows with a design: hair braided flat to the scalp in neat cornrows that run back from the forehead in a gently curved, zigzag pattern",
    barber: ["Braids: flat cornrows, front to back", "Pattern: gentle curves or zigzag", "Ends: tucked at the nape", "Best for: oval, long and diamond faces"],
  },
  {
    slug: "moroccan-curly-fade", name: "Curly top, mid fade", gender: M, region: "africa", country: "Morocco", code: "MA",
    line: "Short, defined curls on top with a mid fade and a neat beard.",
    length: "Short", best: ["Round", "Oval", "Heart"], avoid: [], needs: "short",
    texture: [0, 2, 2], upkeep: "medium", family: "curly", effects: ["height", "soft-texture"],
    cut: "a curly top with a mid fade: defined curls about 4–5 cm on top, a mid skin fade on the sides that blends into a short, neat beard",
    barber: ["Top: 4–5 cm, curls cut dry", "Sides: mid skin fade", "Beard: short and neat, blended", "Best for: round, oval and heart-shaped faces"],
  },

  // --------------------------------------------------------- Africa, women
  {
    slug: "ghana-braids", name: "Ghana braids", gender: W, region: "africa", country: "Ghana", code: "GH",
    line: "Bold, chunky cornrows braided straight back, growing thicker as they go.",
    length: "Long", best: ["Oval", "Heart", "Long"], avoid: [], needs: "ear",
    texture: [0, 1, 2], upkeep: "low", family: "braids", effects: ["show-face", "long-lines"],
    cut: "Ghana braids: six to eight chunky cornrows braided straight back from the forehead, starting thin and growing thicker, ending in long braids past the shoulders",
    barber: ["Braids: 6–8 feed-in cornrows, straight back", "Size: thin at the front, thicker towards the ends", "Length: past the shoulders (with extensions)", "Best for: oval, heart-shaped and long faces"],
  },
  {
    slug: "bantu-knots", name: "Bantu knots", gender: W, region: "africa", country: "South Africa", code: "ZA",
    line: "Small, neat coiled knots in even sections across the head.",
    length: "Short", best: ["Oval", "Heart", "Diamond"], avoid: [], needs: "chin",
    texture: [0, 1, 2], upkeep: "medium", family: "braids", effects: ["show-face", "height"],
    cut: "Bantu knots: hair parted into neat triangular sections, each twisted and coiled into a small knot sitting flat against the head",
    barber: ["Parts: neat triangles", "Knots: twisted and coiled tight to the head", "Best for: oval, heart-shaped and diamond faces"],
  },
  {
    slug: "fulani-braids", name: "Fulani braids", gender: W, region: "africa", country: "Mali", code: "ML",
    line: "A centre cornrow with braids framing the face and long braids at the back, often with beads.",
    length: "Very long", best: ["Oval", "Round", "Heart"], avoid: [], needs: "ear",
    texture: [0, 1, 2], upkeep: "low", family: "braids", effects: ["face-framing", "long-lines"],
    cut: "Fulani braids: a cornrow running down the centre of the head, side cornrows braided towards the face and ending in braids framing it, and long braids at the back, finished with a few gold beads",
    barber: ["Centre: one cornrow front to back", "Sides: cornrows braided towards the face", "Finish: a few gold beads", "Best for: oval, round and heart-shaped faces"],
  },
  {
    slug: "senegalese-twists", name: "Senegalese twists", gender: W, region: "africa", country: "Senegal", code: "SN",
    line: "Long, smooth, rope-like twists that hang neatly to the mid-back.",
    length: "Very long", best: ["Round", "Oval", "Square"], avoid: [], needs: "chin",
    texture: [0, 1, 2], upkeep: "low", family: "braids", effects: ["long-lines"],
    cut: "Senegalese twists: long, smooth, rope-like two-strand twists in medium size, falling to the mid-back",
    barber: ["Parts: neat squares", "Twists: two-strand rope twists, medium size", "Length: to the mid-back (with extensions)", "Best for: round, oval and square faces"],
  },
  {
    slug: "irun-kiko", name: "Irun kiko threading", gender: W, region: "africa", country: "Nigeria", code: "NG",
    line: "Sections wrapped tightly with black thread into upright, sculptural shapes — a Yoruba tradition.",
    length: "Medium", best: ["Oval", "Long", "Heart"], avoid: [], needs: "chin",
    texture: [0, 1, 2], upkeep: "medium", family: "braids", effects: ["height", "sharp"],
    cut: "irun kiko threading: hair parted into sections, each wrapped tightly with black thread into firm upright strands that curve together at the top of the head",
    barber: ["Parts: even sections", "Thread: black, wrapped tight from root to tip", "Shape: strands curved up and together", "Best for: oval, long and heart-shaped faces"],
  },
  {
    slug: "shuruba", name: "Shuruba braids", gender: W, region: "africa", country: "Ethiopia", code: "ET",
    line: "Fine cornrows braided back over the crown, opening into soft, loose hair at the back.",
    length: "Long", best: ["Oval", "Round", "Long"], avoid: [], needs: "shoulder",
    texture: [1, 1, 2], upkeep: "medium", family: "braids", effects: ["show-face", "side-volume"],
    cut: "shuruba braids: fine cornrows braided back from the forehead over the crown, ending at the back of the head where the hair is left loose and fluffy to the shoulders",
    barber: ["Front: fine cornrows straight back", "Back: hair left loose and full", "Best for: oval, round and long faces"],
  },
  {
    slug: "afro-puff", name: "High afro puff", gender: W, region: "africa", country: "Kenya", code: "KE",
    line: "Natural hair gathered into a big, round puff at the crown with smooth edges.",
    length: "Medium", best: ["Oval", "Heart", "Square"], avoid: [], needs: "chin",
    texture: [0, 1, 2], upkeep: "low", family: "curly", effects: ["height", "show-face"],
    cut: "a high afro puff: natural coily hair smoothed back from the hairline and gathered into a big, round puff at the crown",
    barber: ["Edges: smoothed back", "Puff: high, at the crown, fluffed round", "Best for: oval, heart-shaped and square faces"],
  },

  // ------------------------------------------------------ Middle East, men
  {
    slug: "turkish-fade", name: "Turkish fade, textured top", gender: M, region: "middle-east", country: "Türkiye", code: "TR",
    line: "A razor-clean skin fade with a messy, textured top, finished with a hot towel.",
    length: "Short", best: ["Round", "Oval", "Square"], avoid: [], needs: "medium",
    texture: [2, 2, 1], upkeep: "high", family: "quiff", effects: ["height", "soft-texture"],
    cut: "a Turkish fade with a textured top: hair about 5–6 cm on top worked up into a messy, textured shape, with a high skin fade finished with a razor and a sharp, shaped beard",
    barber: ["Top: 5–6 cm, textured, pushed up", "Sides: high skin fade, razor finish", "Beard: sharp shape-up", "Best for: round, oval and square faces"],
  },
  {
    slug: "lebanese-pompadour", name: "Wavy pompadour", gender: M, region: "middle-east", country: "Lebanon", code: "LB",
    line: "Full waves swept up and back over tapered sides.",
    length: "Medium", best: ["Round", "Square", "Oval"], avoid: ["Long"], needs: "medium-long",
    texture: [1, 2, 2], upkeep: "high", family: "quiff", effects: ["height", "soft-texture"],
    cut: "a wavy pompadour: wavy hair about 8–10 cm on top swept up and back with full volume at the front, and a scissor taper on the sides",
    barber: ["Top: 8–10 cm", "Shape: up and back, waves kept", "Sides: scissor taper", "Best for: round, square and oval faces"],
  },
  {
    slug: "persian-curls", name: "Persian curls", gender: M, region: "middle-east", country: "Iran", code: "IR",
    line: "Loose, medium-length curls on top with shorter, neat sides.",
    length: "Medium", best: ["Long", "Oval", "Square"], avoid: [], needs: "medium-long",
    texture: [0, 2, 2], upkeep: "medium", family: "curly", effects: ["soft-texture", "side-volume"],
    cut: "Persian curls: loose curls about 8–9 cm on top falling naturally forward and to the sides, with 3–4 cm scissor-cut sides",
    barber: ["Top: 8–9 cm, curls cut dry", "Sides: 3–4 cm, scissors", "Best for: long, oval and square faces"],
  },
  {
    slug: "gulf-taper", name: "Gulf short taper", gender: M, region: "middle-east", country: "United Arab Emirates", code: "AE",
    line: "A short, very tidy taper that sits neatly under a ghutra.",
    length: "Very short", best: ["Oval", "Square", "Long"], avoid: [], needs: "short",
    texture: [2, 2, 2], upkeep: "medium", family: "clipper", effects: ["sharp", "show-face"],
    cut: "a Gulf short taper: hair about 1.5–2 cm on top, a smooth low taper on the sides and back, and a neat squared neckline with a shaped beard",
    barber: ["Top: 1.5–2 cm", "Sides: low taper", "Neckline: squared", "Beard: shaped, lined up", "Best for: oval, square and long faces"],
  },
  {
    slug: "saudi-beard-crop", name: "Crop with a full beard", gender: M, region: "middle-east", country: "Saudi Arabia", code: "SA",
    line: "A short crop paired with a full, well-shaped beard — the beard is the star.",
    length: "Short", best: ["Round", "Oval", "Heart"], avoid: [], needs: "short",
    texture: [2, 2, 2], upkeep: "medium", family: "crop", effects: ["low-top", "sharp"],
    cut: "a crop with a full beard: hair about 2–3 cm on top pushed forward, a low fade on the sides, and a full beard shaped with crisp cheek lines",
    barber: ["Top: 2–3 cm, pushed forward", "Sides: low fade", "Beard: full, crisp cheek lines", "Best for: round, oval and heart-shaped faces"],
  },

  // ---------------------------------------------------- Middle East, women
  {
    slug: "lebanese-blowout", name: "Lebanese voluminous blow-out", gender: W, region: "middle-east", country: "Lebanon", code: "LB",
    line: "Long, glossy hair blow-dried big with soft curls at the ends.",
    length: "Long", best: ["Long", "Oval", "Diamond"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 1], upkeep: "high", family: "layers", effects: ["side-volume", "long-lines"],
    cut: "a Lebanese voluminous blow-out: long, glossy layered hair blow-dried with big volume at the roots and soft, bouncy curls at the ends, parted to one side",
    barber: ["Layers: long, keep your length", "Blow-dry: big round brush, root lift", "Ends: soft curls", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "turkish-bridal-waves", name: "Bridal waves, half up", gender: W, region: "middle-east", country: "Türkiye", code: "TR",
    line: "Long waves with the front sections twisted back and pinned at the crown.",
    length: "Long", best: ["Round", "Oval", "Square"], avoid: [], needs: "below-shoulder",
    texture: [1, 2, 2], upkeep: "high", family: "long", effects: ["height", "soft-texture"],
    cut: "bridal waves, half up: long hair set in soft waves, with the front sections twisted back and pinned at the crown for gentle height, the rest falling loose",
    barber: ["Waves: large iron, brushed soft", "Half up: front twisted back, pinned at the crown", "Keep your length", "Best for: round, oval and square faces"],
  },
  {
    slug: "persian-curtain-layers", name: "Long layers with curtain bangs", gender: W, region: "middle-east", country: "Iran", code: "IR",
    line: "Long, thick layers with full curtain bangs parted in the centre.",
    length: "Long", best: ["Long", "Square", "Oval"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 1], upkeep: "medium", family: "bangs", effects: ["fringe", "long-lines"],
    cut: "long layers with curtain bangs: thick long hair with long layers, and full curtain bangs parted in the centre sweeping out to each side at the cheekbones",
    barber: ["Bangs: curtain, centre part, to the cheekbones", "Layers: long, keep your length", "Best for: long, square and oval faces"],
  },
  {
    slug: "emirati-sleek", name: "Sleek long hair, middle part", gender: W, region: "middle-east", country: "United Arab Emirates", code: "AE",
    line: "Very long, glass-smooth hair with a sharp centre parting.",
    length: "Very long", best: ["Round", "Oval", "Heart"], avoid: ["Long"], needs: "below-shoulder",
    texture: [2, 1, 1], upkeep: "high", family: "long", effects: ["long-lines"],
    cut: "sleek long hair with a middle part: very long, glass-smooth straight hair with a sharp centre parting, the ends cut in a clean line",
    barber: ["Part: sharp, centre", "Finish: flat iron, shine serum", "Ends: one clean line, keep your length", "Best for: round, oval and heart-shaped faces"],
  },
  {
    slug: "egyptian-blunt-bob", name: "Blunt bob with a fringe", gender: W, region: "middle-east", country: "Egypt", code: "EG",
    line: "A dead-straight bob at the jaw with a blunt fringe — a shape with thousands of years behind it.",
    length: "Short", best: ["Oval", "Long", "Heart"], avoid: ["Round"], needs: "chin",
    texture: [2, 0, 0], upkeep: "medium", family: "bob", effects: ["fringe", "width-low", "sharp"],
    cut: "a blunt bob with a fringe: dead-straight dark hair cut in one blunt line at the jaw, with a heavy blunt fringe at the eyebrows",
    barber: ["Length: one blunt line at the jaw", "Fringe: heavy, blunt, at the eyebrows", "Best for: oval, long and heart-shaped faces"],
  },

  // ---------------------------------------------------------- Oceania, men
  {
    slug: "surfer-flow", name: "Surfer flow", gender: M, region: "oceania", country: "Australia", code: "AU",
    line: "Sun-loosened, wavy hair to the jaw, pushed back with the fingers.",
    length: "Long", best: ["Oval", "Square", "Long"], avoid: ["Round"], needs: "long",
    texture: [2, 2, 1], upkeep: "low", family: "long", effects: ["soft-length", "soft-texture"],
    cut: "a surfer flow: loose, wavy hair about 12–15 cm pushed back with the fingers, falling to around the jaw with a light, salty texture",
    barber: ["Length: 12–15 cm, to the jaw", "Layers: light, for movement", "Finish: sea-salt spray", "Best for: oval, square and long faces"],
  },
  {
    slug: "aussie-mullet", name: "Aussie mullet", gender: M, region: "oceania", country: "Australia", code: "AU",
    line: "Short at the front and sides, long at the back: business in front, party behind.",
    length: "Medium", best: ["Oval", "Square", "Heart"], avoid: [], needs: "medium-long",
    texture: [2, 2, 2], upkeep: "medium", family: "shag", effects: ["soft-length", "soft-texture"],
    cut: "an Aussie mullet: hair about 5–6 cm on top and short tapered sides, with the back left long, about 12–15 cm, falling over the collar",
    barber: ["Top: 5–6 cm, textured", "Sides: short taper", "Back: 12–15 cm, left long", "Best for: oval, square and heart-shaped faces"],
  },
  {
    slug: "kiwi-top-knot", name: "Top knot with an undercut", gender: M, region: "oceania", country: "New Zealand", code: "NZ",
    line: "Long hair on top tied up in a knot, over short clipped sides.",
    length: "Long", best: ["Oval", "Round", "Square"], avoid: ["Long"], needs: "long",
    texture: [2, 2, 2], upkeep: "medium", family: "slick", effects: ["show-face", "sharp", "height"],
    cut: "a top knot with an undercut: long hair on top pulled back and tied into a neat knot at the crown, with the sides and back clipped to about 6 mm",
    barber: ["Top: long enough to tie, about 15 cm+", "Sides and back: #2 guard", "Knot: at the crown", "Best for: oval, round and square faces"],
  },
  {
    slug: "polynesian-curls", name: "Polynesian curls", gender: M, region: "oceania", country: "Samoa", code: "WS",
    line: "Thick, natural curls left full on top with tapered sides.",
    length: "Medium", best: ["Long", "Oval", "Square"], avoid: [], needs: "medium-long",
    texture: [0, 2, 2], upkeep: "low", family: "curly", effects: ["height", "soft-texture"],
    cut: "Polynesian curls: thick natural curls about 8–10 cm on top, full and rounded, with a low taper on the sides and back",
    barber: ["Top: 8–10 cm, curls cut dry", "Sides: low taper", "Best for: long, oval and square faces"],
  },

  // -------------------------------------------------------- Oceania, women
  {
    slug: "beach-waves", name: "Beach waves", gender: W, region: "oceania", country: "Australia", code: "AU",
    line: "Loose, piecey waves that look like a day at the beach.",
    length: "Long", best: ["Oval", "Square", "Long"], avoid: [], needs: "shoulder",
    texture: [1, 2, 2], upkeep: "low", family: "layers", effects: ["soft-texture", "side-volume"],
    cut: "beach waves: hair below the shoulders with long layers and loose, piecey, undone waves from the cheekbones down, with a matte, salty finish",
    barber: ["Layers: long, keep your length", "Waves: loose, flat iron or wand", "Finish: sea-salt spray", "Best for: oval, square and long faces"],
  },
  {
    slug: "kiwi-textured-lob", name: "Textured lob", gender: W, region: "oceania", country: "New Zealand", code: "NZ",
    line: "A collarbone lob with choppy ends and an easy, lived-in texture.",
    length: "Medium", best: ["Round", "Oval", "Heart"], avoid: [], needs: "shoulder",
    texture: [2, 2, 1], upkeep: "low", family: "lob", effects: ["long-lines", "soft-texture"],
    cut: "a textured lob: hair ending at the collarbone with choppy, point-cut ends and a lived-in, slightly wavy texture, parted off-centre",
    barber: ["Length: at the collarbone", "Ends: point-cut, choppy", "Part: off-centre", "Best for: round, oval and heart-shaped faces"],
  },
  {
    slug: "fijian-afro", name: "Fijian afro", gender: W, region: "oceania", country: "Fiji", code: "FJ",
    line: "A big, rounded afro of natural curls, shaped evenly all round.",
    length: "Medium", best: ["Long", "Oval", "Diamond"], avoid: ["Round"], needs: "chin",
    texture: [0, 1, 2], upkeep: "medium", family: "curly", effects: ["side-volume", "height", "soft-texture"],
    cut: "a Fijian afro: natural curly hair about 12–15 cm shaped into a big, evenly rounded afro all round the head",
    barber: ["Length: 12–15 cm", "Shape: rounded, cut after picking out", "Best for: long, oval and diamond faces"],
  },
  {
    slug: "polynesian-long-waves", name: "Long waves with a flower", gender: W, region: "oceania", country: "Samoa", code: "WS",
    line: "Very long, glossy waves with a flower tucked behind one ear.",
    length: "Very long", best: ["Oval", "Round", "Heart"], avoid: [], needs: "below-shoulder",
    texture: [2, 2, 2], upkeep: "low", family: "long", effects: ["long-lines", "soft-texture"],
    cut: "long waves with a flower: very long, glossy, naturally wavy hair worn loose with a centre part and a white frangipani flower tucked behind one ear",
    barber: ["Length: keep your length", "Waves: natural, lightly defined", "Finish: a flower behind one ear", "Best for: oval, round and heart-shaped faces"],
  },
];

const BY_SLUG = new Map(WORLD_STYLES.map((s) => [s.slug, s]));

export function worldStyleBySlug(slug: string): WorldStyle | null {
  return BY_SLUG.get(slug) ?? null;
}

/** The id a world style has as a Tressform hairstyle (for /api/generate, checkout and pictures). */
export function worldStyleId(slug: string): string {
  return `world-${slug}`;
}

/** The world styles as ordinary hairstyles, so any of them can be tried on a customer's own face. */
export function worldAsHairstyles(): Hairstyle[] {
  return WORLD_STYLES.map((s) => ({
    id: worldStyleId(s.slug),
    gender: s.gender,
    name: s.name,
    family: s.family,
    needs: s.needs,
    texture: s.texture,
    best: s.best,
    avoid: s.avoid,
    upkeep: s.upkeep,
    line: s.line,
    prompt: s.cut,
    effects: s.effects,
    barberNotes: s.barber,
    world: { slug: s.slug, region: s.region, country: s.country, code: s.code },
  }));
}

/**
 * "Will this suit your face?" and the buy buttons: the selfie upload with
 * this style chosen (components/UploadFlow.tsx). With `buy`, the customer
 * goes straight on to the single-picture checkout once their photo is read.
 */
export function tryLink(id: string, buy?: "front" | "all"): string {
  return `/?style=${encodeURIComponent(id)}${buy ? `&buy=${buy}` : ""}#upload`;
}

/** "Showing 12 men's styles from Europe" */
export function showingLine(count: number, gender: HairGender, region: WorldRegion | "all"): string {
  const who = gender === "men" ? "men's" : "women's";
  const where = region === "all" ? "from around the world" : `from ${REGION_LABEL[region]}`;
  return `Showing ${count} ${who} ${count === 1 ? "style" : "styles"} ${where}`;
}


// Tressform's hairstyle lists: 30 men's and 30 women's styles.
//
// 10.10.2026. This is the ONE list everything reads from: the owner's
// Studio (quick-pick buttons), the picker that chooses a customer's styles
// (lib/recommend.ts) and the review document the owner signs off. A style
// is added, changed or removed HERE and nowhere else.
//
// Each style says, in plain terms a stylist would agree with:
//   needs    the shortest hair a customer must have TODAY to get this cut.
//            This is what makes the owner's rule possible: the top 5 picks
//            must be cuts the customer can get today, never a style they
//            would first have to grow their hair for.
//   texture  how the style works on straight / wavy / curly hair:
//            2 = works with the hair as it is, 1 = needs daily styling
//            (blow-dry, product, straightening), 0 = not offered.
//   best     face shapes it flatters most, STRONGEST FIRST: the first shape
//            is the one this cut is most recommended for, and it scores
//            highest. avoid = never shown for these. A shape in neither
//            list is "fine".
//   upkeep   daily effort plus how often it needs a trim.
//   family   styles that look alike; the picker limits how many of one
//            family reach the top 5 so the five look different.
//   line     one plain sentence for the customer.
//   front    (added 11.10.2026, see FRONT_VIEW below) the same cut described
//            only by what can be seen from the front. This is what the
//            image model is told for the front picture.
//   prompt   the whole cut in stylist's terms, back of the head included:
//            for the barber card and the side and back pictures. The first 12
//            of each list were tested in the Studio on 10.10.2026. Some
//            women's descriptions were then tightened where the picture
//            missed the cut: curtain bangs came out as a full fringe, the
//            chin-length bob and wavy lob came out too long, and "no
//            fringe" is now said outright where there is none.
//
// The order inside each list breaks ties between equal scores: the common,
// everyday styles come first.

import type { FaceShape } from "@/lib/faceShape";

export type HairGender = "men" | "women";
export type HairTexture = "straight" | "wavy" | "curly";
export type Upkeep = "low" | "medium" | "high";

/** Men: how long the hair on top is now. */
export const MEN_LENGTHS = ["very-short", "short", "medium", "long"] as const;
export type MenLength = (typeof MEN_LENGTHS)[number];
/** Women: where the hair reaches when it is left open. */
export const WOMEN_LENGTHS = ["ear", "chin", "shoulder", "below-shoulder", "mid-back", "waist"] as const;
export type WomenLength = (typeof WOMEN_LENGTHS)[number];
export type HairLength = MenLength | WomenLength;

export const LENGTH_LABELS: Record<HairLength, string> = {
  "very-short": "Very short (under 2 cm)",
  short: "Short (2 to 5 cm)",
  medium: "Medium (5 to 10 cm)",
  long: "Long (over 10 cm, covers the ears)",
  ear: "Ear length",
  chin: "Chin length",
  shoulder: "Shoulder length",
  "below-shoulder": "Below the shoulder",
  "mid-back": "Mid-back",
  waist: "Waist length",
};

/**
 * The shortest hair a style needs. Men use the men's lengths. Women's
 * styles need "ear", "chin", "shoulder" or "below-shoulder"; a style that
 * needs "below-shoulder" is a long-hair cut that keeps the customer's own
 * length (a trim and a shape), however long her hair is.
 */
export type StyleNeeds = MenLength | "ear" | "chin" | "shoulder" | "below-shoulder";

export interface Hairstyle {
  id: string;
  gender: HairGender;
  name: string;
  family: string;
  needs: StyleNeeds;
  /** [straight, wavy, curly]: 2 as it is, 1 with daily styling, 0 not offered. */
  texture: [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2];
  best: FaceShape[];
  avoid: FaceShape[];
  upkeep: Upkeep;
  line: string;
  prompt: string;
  /** The cut as seen from the front, where `prompt` talks about the back of the head. */
  front?: string;
}

type Row = Omit<Hairstyle, "gender">;

const MEN: Row[] = [
  {
    id: "m-textured-quiff",
    name: "Textured quiff, low taper",
    family: "quiff",
    needs: "medium",
    texture: [2, 2, 1],
    best: ["Round", "Oval", "Square"],
    avoid: ["Long"],
    upkeep: "medium",
    line: "Hair lifted up at the front with a rough, piecey finish and neat tapered sides.",
    prompt:
      "a short textured quiff: hair on top about 5–7 cm, lifted up and slightly back at the front with visible, piecey texture, and a low taper fade on the sides and at the nape",
  },
  {
    id: "m-side-part",
    name: "Classic side part, taper",
    family: "part",
    needs: "medium",
    texture: [2, 2, 1],
    best: ["Square", "Oval", "Long"],
    avoid: [],
    upkeep: "low",
    line: "Combed neatly to one side from a clean parting. The safe office cut.",
    prompt:
      "a classic side part: hair on top about 5–6 cm combed neatly to one side from a clean natural parting, with tapered sides and back cut with scissors and a tidy neckline",
  },
  {
    id: "m-textured-crop",
    name: "Textured crop, mid fade",
    family: "crop",
    needs: "short",
    texture: [2, 2, 2],
    best: ["Long", "Oval", "Heart", "Diamond"],
    avoid: ["Round"],
    upkeep: "low",
    line: "Short and choppy on top, pushed forward into a short fringe, with faded sides.",
    prompt:
      "a short textured crop: choppy, textured hair on top about 3–4 cm pushed slightly forward with a short uneven fringe, and a clean mid skin fade on the sides and back",
  },
  {
    id: "m-crew-cut",
    name: "Crew cut",
    family: "clipper",
    needs: "short",
    texture: [2, 2, 2],
    best: ["Square", "Oval", "Diamond"],
    avoid: [],
    upkeep: "low",
    line: "Short all over, a little longer at the front. Almost no styling.",
    prompt:
      "a crew cut: short hair on top about 2–3 cm, slightly longer at the front hairline, with short tapered sides and back",
  },
  {
    id: "m-buzz-cut",
    name: "Buzz cut",
    family: "clipper",
    needs: "very-short",
    texture: [2, 2, 2],
    best: ["Square", "Oval"],
    avoid: [],
    upkeep: "low",
    line: "Clipped very short, the same length all over.",
    prompt: "an even buzz cut: the hair clipped very short all over, about 6 mm, with a sharp, clean hairline",
  },
  {
    id: "m-slick-back-undercut",
    name: "Slick back, undercut",
    family: "slick",
    needs: "medium",
    texture: [2, 1, 0],
    best: ["Square", "Oval", "Diamond"],
    avoid: ["Heart"],
    upkeep: "high",
    line: "Long on top and combed straight back, with the sides clipped short.",
    prompt:
      "a slicked-back undercut: hair on top about 8–10 cm combed straight back with a slight shine, and short clipped sides and back disconnected from the top",
  },
  {
    id: "m-pompadour",
    name: "Pompadour, low fade",
    family: "quiff",
    needs: "medium",
    texture: [2, 2, 1],
    best: ["Round", "Oval", "Square"],
    avoid: ["Long"],
    upkeep: "high",
    line: "Swept up and back with real height at the front. Needs a blow-dry.",
    prompt:
      "a modern pompadour: hair on top about 8–10 cm swept up and back with height at the front, and a low fade on the sides",
  },
  {
    id: "m-medium-flow",
    name: "Medium layered flow",
    family: "long",
    needs: "long",
    texture: [2, 2, 2],
    best: ["Diamond", "Oval", "Square", "Heart"],
    avoid: ["Round"],
    upkeep: "medium",
    line: "Grown-out hair swept back and to the side, long enough to tuck behind the ears.",
    prompt:
      "a medium-length layered cut: hair about 10–12 cm on top and around the ears, swept back and to the side with natural movement, the sides left long enough to tuck behind the ears",
  },
  {
    id: "m-curly-top",
    name: "Curly top, taper fade",
    family: "curly",
    needs: "medium",
    texture: [0, 1, 2],
    best: ["Round", "Oval", "Square"],
    avoid: [],
    upkeep: "medium",
    line: "Natural curls kept on top, with the sides and back tapered short.",
    prompt:
      "a curly top with a taper fade: defined natural curls on top about 5–7 cm, with the sides and back tapered short and a clean neckline",
  },
  {
    id: "m-short-spiky",
    name: "Short spiky, taper",
    family: "spiky",
    needs: "short",
    texture: [2, 1, 0],
    best: ["Round", "Oval", "Square"],
    avoid: ["Long"],
    upkeep: "medium",
    line: "Short hair styled upward into soft spikes.",
    prompt:
      "short spiky hair: hair on top about 3–5 cm styled upward into soft textured spikes, with tapered sides and back",
  },
  {
    id: "m-messy-fringe",
    name: "Messy fringe, taper",
    family: "crop",
    needs: "medium",
    texture: [2, 2, 2],
    best: ["Long", "Heart", "Oval", "Diamond"],
    avoid: ["Round"],
    upkeep: "low",
    line: "Loose hair falling forward over the forehead, with tidy sides.",
    prompt:
      "a messy textured fringe: hair on top about 6–8 cm falling forward over the forehead in loose, textured strands, with a low taper on the sides",
  },
  {
    id: "m-ivy-league",
    name: "Ivy League",
    family: "classic",
    needs: "short",
    texture: [2, 2, 1],
    best: ["Oval", "Square", "Round", "Heart"],
    avoid: [],
    upkeep: "low",
    line: "A neat short cut with a side parting and the front brushed up a little.",
    prompt:
      "an Ivy League cut: a neat short cut with about 4–5 cm on top, side-parted and brushed slightly up at the front, with short tapered sides",
  },
  {
    id: "m-buzz-fade",
    name: "Buzz cut, skin fade",
    family: "clipper",
    needs: "very-short",
    texture: [2, 2, 2],
    best: ["Square", "Diamond", "Oval"],
    avoid: [],
    upkeep: "low",
    line: "A buzz cut on top that fades down to skin at the sides.",
    prompt:
      "a buzz cut with a skin fade: the hair on top clipped to about 6–9 mm, fading smoothly down to bare skin on the lower sides and at the nape, with a sharp, clean hairline",
  },
  {
    id: "m-comb-over",
    name: "Comb over, mid fade",
    family: "part",
    needs: "medium",
    texture: [2, 2, 1],
    best: ["Round", "Oval", "Square", "Diamond"],
    avoid: [],
    upkeep: "medium",
    line: "Swept over to one side with some lift, and faded sides.",
    prompt:
      "a comb over with a mid fade: hair on top about 6–8 cm combed over to one side with a little volume and a clearly defined parting, and a clean mid fade on the sides and back",
  },
  {
    id: "m-burst-fade",
    name: "Burst fade, textured top",
    family: "spiky",
    needs: "medium",
    texture: [2, 2, 2],
    best: ["Round", "Oval", "Diamond"],
    avoid: ["Long"],
    upkeep: "medium",
    line: "Textured hair on top and a fade that curves round the ear.",
    prompt:
      "a burst fade with a textured top: messy textured hair on top about 5–7 cm, a fade that curves in a semicircle around each ear down to skin, and the hair at the back of the neck left a little longer",
  },
  {
    id: "m-faux-hawk",
    name: "Faux hawk, fade",
    family: "spiky",
    needs: "medium",
    texture: [2, 2, 1],
    best: ["Round", "Oval", "Square"],
    avoid: ["Long"],
    upkeep: "medium",
    line: "Hair pushed up toward the middle of the head, with short faded sides.",
    prompt:
      "a faux hawk: hair on top about 5–7 cm pushed up and toward the centre line of the head into a soft ridge, with a mid fade on the sides and back",
  },
  {
    id: "m-brush-up",
    name: "Brush up, taper",
    family: "quiff",
    needs: "medium",
    texture: [2, 2, 1],
    best: ["Round", "Diamond", "Oval"],
    avoid: ["Long"],
    upkeep: "medium",
    line: "The whole top brushed straight up and slightly back for a full, airy look.",
    prompt:
      "a brush up: hair on top about 6–8 cm blow-dried straight up and slightly back with a full, airy, matte finish, and a low taper on the sides and at the nape",
  },
  {
    id: "m-side-swept-fringe",
    name: "Side-swept fringe, taper",
    family: "sweep",
    needs: "medium",
    texture: [2, 2, 1],
    best: ["Heart", "Long", "Diamond", "Oval"],
    avoid: [],
    upkeep: "low",
    line: "The front hair swept across the forehead to one side.",
    prompt:
      "a side-swept fringe: hair on top about 7–9 cm, the front swept diagonally across the forehead to one side, with softly tapered sides and a tidy neckline",
  },
  {
    id: "m-two-block",
    name: "Two-block cut",
    family: "crop",
    needs: "medium",
    texture: [2, 2, 0],
    best: ["Long", "Oval", "Heart", "Diamond"],
    avoid: ["Round"],
    upkeep: "medium",
    line: "Longer hair on top falling over short clipped sides. The Korean-style cut.",
    prompt:
      "a two-block cut: the sides and back clipped short up to the temples, with longer straight hair on top about 8–10 cm falling down over them and a soft fringe resting on the forehead with a slight centre parting",
  },
  {
    id: "m-slick-back-taper",
    name: "Slick back, taper",
    family: "slick",
    needs: "medium",
    texture: [2, 1, 0],
    best: ["Oval", "Square"],
    avoid: ["Heart"],
    upkeep: "medium",
    line: "Combed straight back, with the sides tapered and blended in.",
    prompt:
      "a slick back with tapered sides: hair on top about 7–9 cm combed straight back off the forehead with a light shine, blended smoothly into tapered sides and back with no hard line",
  },
  {
    id: "m-short-back-sides",
    name: "Short back and sides",
    family: "classic",
    needs: "short",
    texture: [2, 2, 2],
    best: ["Oval", "Square", "Heart"],
    avoid: [],
    upkeep: "low",
    line: "The classic scissor cut: short and tidy at the back and sides, natural on top.",
    prompt:
      "a classic short back and sides: the back and sides cut short and neat with scissors, about 4 cm of natural, lightly combed hair on top, and a clean natural neckline",
  },
  {
    id: "m-high-and-tight",
    name: "High and tight",
    family: "clipper",
    needs: "short",
    texture: [2, 2, 2],
    best: ["Square", "Oval"],
    avoid: ["Long"],
    upkeep: "low",
    line: "Very short sides taken high up the head, with a short strip left on top.",
    prompt:
      "a high and tight: the sides and back clipped down to skin high up the head, with a short strip of hair about 1–2 cm left on top",
  },
  {
    id: "m-curly-fringe",
    name: "Curly fringe, low fade",
    family: "curly",
    needs: "medium",
    texture: [0, 1, 2],
    best: ["Long", "Heart", "Oval", "Diamond"],
    avoid: ["Round"],
    upkeep: "medium",
    line: "Natural curls left to fall forward over the forehead, with low faded sides.",
    prompt:
      "a curly fringe with a low fade: defined natural curls on top about 6–8 cm falling forward over the forehead, with a low fade on the sides and at the nape",
  },
  {
    id: "m-short-curls",
    name: "Short curls, tidy taper",
    family: "curly",
    needs: "short",
    texture: [0, 1, 2],
    best: ["Oval", "Square", "Diamond"],
    avoid: [],
    upkeep: "low",
    line: "Curls cut short and even, with neat tapered sides.",
    prompt:
      "short natural curls: tight, defined curls on top about 3–4 cm cut to an even rounded shape, with neatly tapered sides and a clean neckline",
  },
  {
    id: "m-wavy-side-sweep",
    name: "Wavy side sweep, taper",
    family: "sweep",
    needs: "medium",
    texture: [1, 2, 2],
    best: ["Heart", "Oval", "Square", "Long"],
    avoid: [],
    upkeep: "low",
    line: "Natural waves pushed loosely to one side.",
    prompt:
      "a wavy side sweep: naturally wavy hair on top about 7–9 cm pushed loosely to one side with soft movement, and softly tapered sides",
  },
  {
    id: "m-middle-part",
    name: "Middle part curtains",
    family: "long",
    needs: "long",
    texture: [2, 2, 1],
    best: ["Oval", "Diamond", "Heart", "Square"],
    avoid: ["Long"],
    upkeep: "medium",
    line: "Parted in the middle, with the front falling to each side like curtains.",
    prompt:
      "middle part curtains: hair about 12 cm on top, parted in the centre and falling to each side of the forehead to about eye level, with shorter tapered sides",
  },
  {
    id: "m-modern-mullet",
    name: "Modern mullet, taper",
    family: "long",
    needs: "long",
    texture: [2, 2, 2],
    best: ["Oval", "Diamond", "Square"],
    avoid: [],
    upkeep: "medium",
    line: "Textured on top, short at the sides and left longer at the back of the neck.",
    prompt:
      "a modern mullet: textured hair on top about 6–8 cm, the sides tapered short, and the hair at the back left longer so it reaches the collar",
  },
  {
    id: "m-shoulder-layers",
    name: "Shoulder-length layers",
    family: "long",
    needs: "long",
    texture: [2, 2, 2],
    best: ["Square", "Oval", "Diamond"],
    avoid: ["Long"],
    upkeep: "medium",
    line: "Long hair to the shoulders, layered so it moves and does not sit flat.",
    prompt:
      "shoulder-length layered hair on a man: hair falling to the shoulders with soft layers and natural movement, parted slightly off-centre and swept away from the face",
  },
  {
    id: "m-top-knot",
    name: "Top knot, undercut",
    family: "long",
    needs: "long",
    texture: [2, 2, 2],
    best: ["Oval", "Square", "Diamond"],
    avoid: ["Long"],
    upkeep: "medium",
    line: "Long hair on top tied in a small knot, with the sides clipped short.",
    prompt:
      "a top knot with an undercut: long hair on top pulled back and tied in a small knot at the crown, with the sides and back clipped short",
  },
  {
    id: "m-long-curls",
    name: "Long curls, shaped",
    family: "curly",
    needs: "long",
    texture: [0, 1, 2],
    best: ["Long", "Oval", "Heart", "Square"],
    avoid: ["Round"],
    upkeep: "medium",
    line: "Curls grown out and cut into a rounded shape so they sit evenly.",
    prompt:
      "long shaped curls on a man: defined natural curls about 12–15 cm long all over, cut into a balanced rounded shape that falls to around the jaw",
  },
];

const WOMEN: Row[] = [
  {
    id: "w-long-layers",
    name: "Long layers",
    family: "layers",
    needs: "below-shoulder",
    texture: [2, 2, 2],
    best: ["Round", "Square", "Oval", "Heart"],
    avoid: [],
    upkeep: "low",
    line: "Keeps your length. Soft layers add movement and take off weight.",
    prompt:
      "long layered hair: length falling below the shoulders to the chest, with long, soft layers starting at the collarbone and smooth, healthy ends, and no fringe",
  },
  {
    id: "w-long-layers-curtain-bangs",
    name: "Long layers, curtain bangs",
    family: "bangs",
    needs: "below-shoulder",
    texture: [2, 2, 1],
    best: ["Long", "Heart", "Oval", "Diamond"],
    avoid: [],
    upkeep: "medium",
    line: "Long layers with a parted fringe that sweeps away to each side of the face.",
    prompt:
      "long layered hair with curtain bangs: length below the shoulders with soft layers, and a long fringe parted in the centre that sweeps out to each side to cheekbone level, leaving the middle of the forehead showing, with no hair lying straight across the forehead",
  },
  {
    id: "w-lob",
    name: "Shoulder-length lob",
    family: "lob",
    needs: "shoulder",
    texture: [2, 2, 1],
    best: ["Round", "Oval", "Heart", "Long"],
    avoid: [],
    upkeep: "low",
    line: "A long bob that rests on the shoulders. Easy to manage, still long enough to tie.",
    prompt:
      "a long bob (lob): hair cut to rest on the shoulders, slightly longer at the front, with a clean blunt edge and a soft bend at the ends, and no fringe",
  },
  {
    id: "w-blunt-bob",
    name: "Blunt bob, chin length",
    family: "bob",
    needs: "chin",
    texture: [2, 1, 0],
    best: ["Heart", "Long", "Oval", "Diamond"],
    avoid: ["Round", "Square"],
    upkeep: "medium",
    line: "Cut to one sharp line at the chin. A bold, clean change.",
    prompt:
      "a chin-length blunt bob: straight hair cut to one sharp, even line level with the chin, well above the shoulders so the neck is visible, sleek and smooth, with no fringe",
  },
  {
    id: "w-wavy-lob",
    name: "Wavy lob",
    family: "lob",
    needs: "shoulder",
    texture: [1, 2, 2],
    best: ["Long", "Square", "Oval", "Diamond", "Heart"],
    avoid: [],
    upkeep: "medium",
    line: "A long bob worn in loose, soft waves.",
    prompt:
      "a wavy long bob: hair cut so the ends sit just above the shoulders, styled in loose, soft waves with a relaxed texture, and no fringe",
  },
  {
    id: "w-face-framing-medium",
    name: "Face-framing layers, medium",
    family: "framing",
    needs: "shoulder",
    texture: [2, 2, 1],
    best: ["Round", "Square", "Diamond", "Oval"],
    avoid: [],
    upkeep: "low",
    line: "Collarbone length, with shorter pieces at the front that curve in around the face.",
    prompt:
      "medium-length hair with face-framing layers: length to the collarbone, with shorter layers beginning at the cheekbones and curving in around the face, and no fringe",
  },
  {
    id: "w-step-cut",
    name: "Step cut",
    family: "layers",
    needs: "below-shoulder",
    texture: [2, 2, 1],
    best: ["Round", "Oval", "Square"],
    avoid: [],
    upkeep: "low",
    line: "Long hair cut in clear steps, so each layer shows and the hair looks fuller.",
    prompt:
      "a step cut: long hair cut in clearly defined layered steps, each layer visibly shorter than the one beneath it, with volume through the lengths",
  },
  {
    id: "w-feather-cut",
    name: "Feather cut",
    family: "layers",
    needs: "below-shoulder",
    texture: [2, 2, 0],
    best: ["Square", "Oval", "Heart", "Diamond"],
    avoid: [],
    upkeep: "medium",
    line: "Light, wispy layers that flick out softly at the ends.",
    prompt:
      "a feather cut: long hair with light, wispy, feathered layers that flick softly outward at the ends, giving a soft, airy outline",
  },
  {
    id: "w-u-cut",
    name: "U-cut, long",
    family: "back-shape",
    needs: "below-shoulder",
    texture: [2, 2, 1],
    best: ["Oval", "Round", "Heart"],
    avoid: ["Long"],
    upkeep: "low",
    line: "Long hair with the ends curved into a soft U at the back. The gentlest trim.",
    prompt: "long straight hair with a U-shaped cut at the back: one length through the front, curving to a soft U at the ends",
  },
  {
    id: "w-layered-shag",
    name: "Layered shag",
    family: "shag",
    needs: "shoulder",
    texture: [1, 2, 2],
    best: ["Long", "Oval", "Heart", "Diamond"],
    avoid: ["Round"],
    upkeep: "medium",
    line: "Lots of choppy layers and a wispy fringe for a tousled, full look.",
    prompt:
      "a shoulder-length shag: lots of choppy layers through the crown and lengths, with a soft wispy fringe and a tousled finish",
  },
  {
    id: "w-pixie",
    name: "Pixie cut",
    family: "pixie",
    needs: "ear",
    texture: [2, 2, 1],
    best: ["Heart", "Oval", "Diamond"],
    avoid: [],
    upkeep: "medium",
    line: "Short all over with a soft side-swept front. The biggest change on the list.",
    prompt:
      "a pixie cut: short hair, about 4–6 cm on top with soft texture and a side-swept fringe, cut close around the ears and at the nape",
  },
  {
    id: "w-side-swept-bangs-medium",
    name: "Side-swept bangs, medium",
    family: "bangs",
    needs: "shoulder",
    texture: [2, 2, 1],
    best: ["Square", "Round", "Heart", "Long"],
    avoid: [],
    upkeep: "medium",
    line: "Just past the shoulders, with a long fringe swept across to one side.",
    prompt:
      "medium-length hair with side-swept bangs: length just past the shoulders with soft layers, and a long fringe swept across the forehead to one side",
  },
  {
    id: "w-v-cut",
    name: "V-cut, long",
    family: "back-shape",
    needs: "below-shoulder",
    texture: [2, 2, 1],
    best: ["Round", "Oval", "Square"],
    avoid: ["Long"],
    upkeep: "low",
    line: "Long hair with the ends cut to a point at the back, so the sides fall shorter.",
    prompt:
      "long hair with a V-shaped cut at the back: the ends cut to a soft point in the centre of the back, so the hair at the sides falls shorter in front of the shoulders, with no fringe",
  },
  {
    id: "w-face-framing-long",
    name: "Face-framing layers, long",
    family: "framing",
    needs: "below-shoulder",
    texture: [2, 2, 1],
    best: ["Square", "Round", "Diamond", "Oval"],
    avoid: [],
    upkeep: "low",
    line: "Keeps your length, with shorter front pieces from the chin down that shape the face.",
    prompt:
      "long hair with face-framing layers: the length kept well below the shoulders, with shorter front pieces starting at the chin and curving in around the face, and no fringe",
  },
  {
    id: "w-long-side-swept-bangs",
    name: "Long layers, side-swept bangs",
    family: "bangs",
    needs: "below-shoulder",
    texture: [2, 2, 1],
    best: ["Heart", "Round", "Square", "Long"],
    avoid: [],
    upkeep: "medium",
    line: "Long layers with a long fringe swept across to one side.",
    prompt:
      "long layered hair with side-swept bangs: length below the shoulders with soft layers, a side parting, and a long fringe swept diagonally across the forehead to one side",
  },
  {
    id: "w-butterfly-cut",
    name: "Butterfly cut",
    family: "layers",
    needs: "below-shoulder",
    texture: [2, 2, 1],
    best: ["Long", "Oval", "Square", "Heart"],
    avoid: [],
    upkeep: "high",
    line: "Short, bouncy layers on top of long hair, for big blow-dried volume.",
    prompt:
      "a butterfly cut: long hair with shorter, voluminous layers around the face and crown that sweep outward away from the face, blending into long layers below the shoulders, with a bouncy blow-dried finish",
  },
  {
    id: "w-straight-cut",
    name: "One-length straight cut",
    family: "back-shape",
    needs: "below-shoulder",
    texture: [2, 1, 0],
    best: ["Oval", "Heart"],
    avoid: ["Long"],
    upkeep: "low",
    line: "Long hair cut straight across at one length, so the ends look thick.",
    prompt:
      "long straight hair cut to one length: sleek hair falling below the shoulders, cut straight across in one blunt, even line at the ends, with a centre parting and no layers or fringe",
  },
  {
    id: "w-wispy-bangs-long",
    name: "Wispy bangs, long",
    family: "bangs",
    needs: "below-shoulder",
    texture: [2, 1, 0],
    best: ["Long", "Oval", "Heart"],
    avoid: ["Round"],
    upkeep: "medium",
    line: "Long hair with a light, see-through fringe across the forehead.",
    prompt:
      "long hair with wispy bangs: length below the shoulders, with a light, thin, see-through fringe falling across the forehead to just above the eyebrows",
  },
  {
    id: "w-long-curly-layers",
    name: "Long curly layers",
    family: "curly",
    needs: "below-shoulder",
    texture: [0, 1, 2],
    best: ["Long", "Oval", "Heart", "Square", "Diamond"],
    avoid: [],
    upkeep: "medium",
    line: "Long curls cut in layers so they sit in a rounded shape and do not drag flat.",
    prompt:
      "long curly layered hair: defined natural curls falling below the shoulders, cut in layers so the curls stack into a rounded, balanced shape with volume, and no fringe",
  },
  {
    id: "w-collarbone-cut",
    name: "Collarbone cut, soft layers",
    family: "lob",
    needs: "shoulder",
    texture: [2, 2, 1],
    best: ["Oval", "Round", "Square", "Long"],
    avoid: [],
    upkeep: "low",
    line: "Ends at the collarbone with a few soft layers. The safe medium length.",
    prompt:
      "a collarbone-length cut: hair ending at the collarbone with a few soft, long layers at the ends, a centre or slightly off-centre parting, and no fringe",
  },
  {
    id: "w-textured-pixie",
    name: "Textured pixie",
    family: "pixie",
    needs: "ear",
    texture: [2, 2, 2],
    best: ["Oval", "Heart", "Square"],
    avoid: [],
    upkeep: "medium",
    line: "Very short, with choppy lifted texture on top and a short fringe.",
    prompt:
      "a textured pixie cut: very short hair, about 3–5 cm on top with choppy, lifted, piecey texture and a short textured fringe, clipped close at the sides and nape with the ears showing",
  },
  {
    id: "w-medium-curtain-bangs",
    name: "Medium layers, curtain bangs",
    family: "bangs",
    needs: "shoulder",
    texture: [2, 2, 1],
    best: ["Diamond", "Long", "Oval", "Heart"],
    avoid: [],
    upkeep: "medium",
    line: "Shoulder-length layers with a parted fringe that sweeps away to each side.",
    prompt:
      "shoulder-length layered hair with curtain bangs: soft layers ending at the shoulders, and a long fringe parted in the centre that sweeps out to each side to cheekbone level, leaving the middle of the forehead showing",
  },
  {
    id: "w-wolf-cut",
    name: "Wolf cut",
    family: "shag",
    needs: "shoulder",
    texture: [1, 2, 2],
    best: ["Oval", "Heart", "Diamond", "Long"],
    avoid: ["Round"],
    upkeep: "high",
    line: "Short choppy layers on top and longer wispy ends. A bold, messy look.",
    prompt:
      "a wolf cut: heavy, choppy, shorter layers at the crown with lots of volume on top, thinning into longer wispy ends at the shoulders, with a soft curtain fringe and a tousled finish",
  },
  {
    id: "w-blunt-shoulder-cut",
    name: "Blunt shoulder cut",
    family: "lob",
    needs: "shoulder",
    texture: [2, 1, 0],
    best: ["Oval", "Long", "Heart"],
    avoid: ["Square"],
    upkeep: "low",
    line: "Straight hair cut to one sharp line at the shoulders.",
    prompt:
      "a blunt shoulder-length cut: straight, sleek hair cut to one sharp, even line exactly at the shoulders, with a centre parting and no layers or fringe",
  },
  {
    id: "w-curly-shoulder-cut",
    name: "Curly shoulder cut",
    family: "curly",
    needs: "shoulder",
    texture: [0, 1, 2],
    best: ["Long", "Oval", "Heart", "Diamond"],
    avoid: ["Round"],
    upkeep: "medium",
    line: "Shoulder-length curls cut into a rounded shape.",
    prompt:
      "a shoulder-length curly cut: defined natural curls ending at the shoulders, cut in rounded layers so the shape is full and even all round, with no fringe",
  },
  {
    id: "w-layered-bob",
    name: "Layered bob",
    family: "bob",
    needs: "chin",
    texture: [2, 2, 1],
    best: ["Heart", "Oval", "Long", "Diamond"],
    avoid: [],
    upkeep: "medium",
    line: "A chin-length bob with soft layers, so it has movement and is not one hard line.",
    prompt:
      "a layered bob: hair cut to chin length with soft layers through the ends for movement and a slightly rounded shape, a side parting, and no fringe",
  },
  {
    id: "w-a-line-bob",
    name: "A-line bob",
    family: "bob",
    needs: "chin",
    texture: [2, 2, 0],
    best: ["Round", "Square", "Oval"],
    avoid: [],
    upkeep: "medium",
    line: "Short at the back, with the front pieces angled down past the chin.",
    prompt:
      "an A-line bob: sleek hair cut short at the nape and angled longer toward the front, the front pieces ending just below the chin, with no fringe",
  },
  {
    id: "w-french-bob",
    name: "French bob with fringe",
    family: "bob",
    needs: "chin",
    texture: [2, 2, 1],
    best: ["Long", "Oval", "Heart"],
    avoid: ["Round", "Square"],
    upkeep: "medium",
    line: "A short bob ending at the jaw, with a full fringe at the eyebrows.",
    prompt:
      "a French bob: a short bob ending at the jawline with softly curved ends, and a full straight fringe resting at the eyebrows",
  },
  {
    id: "w-curly-bob",
    name: "Curly bob",
    family: "curly",
    needs: "chin",
    texture: [0, 1, 2],
    best: ["Diamond", "Oval", "Long", "Heart"],
    avoid: ["Round"],
    upkeep: "medium",
    line: "Curls cut to a rounded bob at the chin.",
    prompt:
      "a curly bob: defined natural curls cut to chin length in a rounded shape with volume at the sides, and no fringe",
  },
  {
    id: "w-bixie",
    name: "Long pixie (bixie)",
    family: "pixie",
    needs: "chin",
    texture: [2, 2, 2],
    best: ["Oval", "Heart", "Square", "Diamond"],
    avoid: [],
    upkeep: "medium",
    line: "Between a pixie and a bob: soft layers that cover the ears, with a long side-swept front.",
    prompt:
      "a long pixie, between a pixie and a bob: soft layered hair that covers the ears and ends at the middle of the neck, with a long side-swept fringe and light texture",
  },
];

// THE FRONT VIEW. 11.10.2026: once the image model was told firmly to cut
// the hair "so the new haircut is plain to see", it began turning a
// front-facing man's head to the side, in two of three pictures. The
// descriptions were asking it to show things no front photo can show — the
// back of the head, the nape, the neckline — and turning the head was the
// only way to obey. With those words taken out, the owner made the same
// style three times and the man faced the camera in all three.
//
// So every style whose description mentions the back gets a second one
// here that stops at what the front shows. tests/hairstyles.test.ts fails
// if a front description ever mentions the back, nape or neckline again.
const FRONT_VIEW: Record<string, string> = {
  "m-textured-quiff":
    "a short textured quiff: hair on top about 5–7 cm, lifted up and slightly back at the front with visible, piecey texture, and a low taper fade on the sides",
  "m-side-part":
    "a classic side part: hair on top about 5–6 cm, combed neatly to one side from a clear parting, with the sides tapered short",
  "m-textured-crop":
    "a short textured crop: choppy, textured hair on top about 3–4 cm pushed slightly forward with a short uneven fringe, and a clean mid skin fade on the sides",
  "m-crew-cut": "a crew cut: short hair on top about 2–3 cm, slightly longer at the front hairline, with short tapered sides",
  "m-slick-back-undercut":
    "a slicked-back undercut: hair on top about 8–10 cm combed straight back off the forehead with a slight shine, and short clipped sides disconnected from the top",
  "m-curly-top": "a curly top with a taper fade: defined natural curls on top about 5–7 cm, with the sides tapered short",
  "m-short-spiky": "short spiky hair: hair on top about 3–5 cm styled upward into soft textured spikes, with tapered sides",
  "m-buzz-fade":
    "a buzz cut with a skin fade: the hair on top clipped to about 6–9 mm, fading smoothly down to bare skin on the lower sides, with a sharp, clean hairline",
  "m-comb-over":
    "a comb over with a mid fade: hair on top about 6–8 cm combed over to one side with a little volume and a clearly defined parting, and a clean mid fade on the sides",
  "m-burst-fade":
    "a burst fade with a textured top: messy textured hair on top about 5–7 cm, and a fade that curves in a semicircle around each ear down to skin",
  "m-faux-hawk":
    "a faux hawk: hair on top about 5–7 cm pushed up and toward the centre line of the head into a soft ridge, with a mid fade on the sides",
  "m-brush-up":
    "a brush up: hair on top about 6–8 cm blow-dried straight up and slightly back with a full, airy, matte finish, and a low taper on the sides",
  "m-side-swept-fringe":
    "a side-swept fringe: hair on top about 7–9 cm, the front swept diagonally across the forehead to one side, with softly tapered sides",
  "m-two-block":
    "a two-block cut: the sides clipped short up to the temples, with longer straight hair on top about 8–10 cm falling down over them and a soft fringe resting on the forehead with a slight centre parting",
  "m-slick-back-taper":
    "a slick back with tapered sides: hair on top about 7–9 cm combed straight back off the forehead with a light shine, blended smoothly into tapered sides with no hard line",
  "m-short-back-sides":
    "a classic short cut: the sides cut short and neat with scissors, and about 4 cm of natural, lightly combed hair on top",
  "m-high-and-tight":
    "a high and tight: the sides clipped down to skin high up the head, with a short strip of hair about 1–2 cm left on top",
  "m-curly-fringe":
    "a curly fringe with a low fade: defined natural curls on top about 6–8 cm falling forward over the forehead, with a low fade on the sides",
  "m-short-curls": "short natural curls: tight, defined curls on top about 3–4 cm cut to an even rounded shape, with neatly tapered sides",
  "m-modern-mullet":
    "a modern mullet: textured hair on top about 6–8 cm, the sides tapered short, and longer hair below the ears that shows on both sides of the neck",
  "m-top-knot": "a top knot with an undercut: long hair on top gathered up and tied in a small knot at the crown, with the sides clipped short",
  // The chin-length bob is here for a different reason. Asked for a bob "level
  // with the chin", the model left the hair at the base of the neck three
  // times running. Asked for one a little shorter than is wanted, it landed
  // at the chin (owner's Studio test, 11.10.2026). The full description
  // above still says chin length, which is what the stylist should cut.
  "w-blunt-bob":
    "a short blunt bob that ends level with the lips, about 3 cm above the chin, cut in one sharp, even line, sleek and smooth, with no fringe; the whole neck is bare from the jaw down to the shoulders",
  "w-u-cut": "long straight hair kept at one length through the front, falling in front of the shoulders, with smooth ends that curve gently inward",
  "w-pixie": "a pixie cut: short hair, about 4–6 cm on top with soft texture and a side-swept fringe, cut close around the ears",
  "w-v-cut":
    "long hair with the side lengths cut shorter so they fall in front of the shoulders, growing longer toward the middle, with smooth ends and no fringe",
  "w-textured-pixie":
    "a textured pixie cut: very short hair, about 3–5 cm on top with choppy, lifted, piecey texture and a short textured fringe, clipped close at the sides so the hair sits above the ears",
  "w-a-line-bob": "an A-line bob: sleek hair angled longer toward the front, the front pieces ending just below the chin, with no fringe",
};

export const HAIRSTYLES: Hairstyle[] = [
  ...MEN.map((row) => ({ ...row, gender: "men" as const })),
  ...WOMEN.map((row) => ({ ...row, gender: "women" as const })),
].map((style) => (FRONT_VIEW[style.id] ? { ...style, front: FRONT_VIEW[style.id] } : style));

/** What the image model is told for the front picture of a style. */
export function frontDescription(style: Hairstyle): string {
  return style.front ?? style.prompt;
}

export function hairstylesFor(gender: HairGender): Hairstyle[] {
  return HAIRSTYLES.filter((style) => style.gender === gender);
}

/** The heading a style sits under in the lists: how much hair it needs. */
export function needsLabel(needs: StyleNeeds): string {
  switch (needs) {
    case "very-short":
      return "Any length";
    case "short":
      return "Short or longer";
    case "medium":
      return "Medium or longer";
    case "long":
      return "Long";
    case "ear":
      return "Ear length or longer";
    case "chin":
      return "Chin length or longer";
    case "shoulder":
      return "Shoulder length or longer";
    case "below-shoulder":
      return "Below the shoulder";
  }
}

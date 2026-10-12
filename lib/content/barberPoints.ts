// Tressform — what to tell the barber, as short points.
//
// 12.10.2026, owner's request: a barber reads a list at a glance, a
// paragraph not. Written by hand for every style from the same facts as
// its barber wording (`barber` / `prompt` in hairstyles.ts) — nothing added,
// nothing left out. Top first, then sides and back, then front, then
// finish. tests/barberPoints.test.ts checks that every style has points.

export const BARBER_POINTS: Record<string, string[]> = {
  // ---------------------------------------------------------------- men
  "m-textured-quiff": [
    "Top: about 5–7 cm",
    "Lifted up and slightly back at the front",
    "Visible, piecey texture",
    "Sides and nape: low taper fade",
  ],
  "m-side-part": [
    "Top: about 5–6 cm, combed neatly to one side",
    "A clean, natural parting",
    "Sides and back: tapered, cut with scissors",
    "A tidy neckline",
  ],
  "m-textured-crop": [
    "Top: about 3–4 cm, choppy and textured",
    "Pushed slightly forward",
    "A short, uneven fringe",
    "Sides and back: clean mid skin fade",
  ],
  "m-crew-cut": [
    "Top: short, about 2–3 cm",
    "Slightly longer at the front hairline",
    "Sides and back: short and tapered",
  ],
  "m-buzz-cut": ["Clipped very short all over, about 6 mm", "Even length everywhere", "A sharp, clean hairline"],
  "m-slick-back-undercut": [
    "Top: about 8–10 cm, combed straight back",
    "A slight shine",
    "Sides and back: short and clipped",
    "Sides disconnected from the top (no blending)",
  ],
  "m-pompadour": [
    "Top: about 8–10 cm, swept up and back",
    "Height at the front",
    "Sides: low fade",
  ],
  "m-medium-flow": [
    "Top and around the ears: about 10–12 cm, layered",
    "Swept back and to the side, with natural movement",
    "Sides left long enough to tuck behind the ears",
  ],
  "m-curly-top": [
    "Top: defined natural curls, about 5–7 cm",
    "Sides and back: tapered short",
    "A clean neckline",
  ],
  "m-short-spiky": [
    "Top: about 3–5 cm",
    "Styled upward into soft, textured spikes",
    "Sides and back: tapered",
  ],
  "m-messy-fringe": [
    "Top: about 6–8 cm",
    "Falling forward over the forehead in loose, textured strands",
    "Sides: low taper",
  ],
  "m-ivy-league": [
    "Top: about 4–5 cm, a neat short cut",
    "Side-parted",
    "Brushed slightly up at the front",
    "Sides: short and tapered",
  ],
  "m-buzz-fade": [
    "Top: clipped to about 6–9 mm",
    "Sides and nape: fading smoothly down to bare skin",
    "A sharp, clean hairline",
  ],
  "m-comb-over": [
    "Top: about 6–8 cm, combed over to one side",
    "A little volume",
    "A clearly defined parting",
    "Sides and back: clean mid fade",
  ],
  "m-burst-fade": [
    "Top: about 5–7 cm, messy and textured",
    "Fade curving in a semicircle around each ear, down to skin",
    "Hair at the back of the neck left a little longer",
  ],
  "m-faux-hawk": [
    "Top: about 5–7 cm",
    "Pushed up and toward the centre line of the head, into a soft ridge",
    "Sides and back: mid fade",
  ],
  "m-brush-up": [
    "Top: about 6–8 cm",
    "Blow-dried straight up and slightly back",
    "A full, airy, matte finish",
    "Sides and nape: low taper",
  ],
  "m-side-swept-fringe": [
    "Top: about 7–9 cm",
    "Front swept diagonally across the forehead to one side",
    "Sides: softly tapered",
    "A tidy neckline",
  ],
  "m-two-block": [
    "Sides and back: clipped short, up to the temples",
    "Top: about 8–10 cm, straight, falling down over the sides",
    "A soft fringe resting on the forehead",
    "A slight centre parting",
  ],
  "m-slick-back-taper": [
    "Top: about 7–9 cm, combed straight back off the forehead",
    "A light shine",
    "Sides and back: tapered",
    "Blended smoothly, with no hard line",
  ],
  "m-short-back-sides": [
    "Back and sides: cut short and neat with scissors",
    "Top: about 4 cm, natural and lightly combed",
    "A clean, natural neckline",
  ],
  "m-high-and-tight": [
    "Sides and back: clipped down to skin, high up the head",
    "Top: a short strip, about 1–2 cm",
  ],
  "m-curly-fringe": [
    "Top: defined natural curls, about 6–8 cm",
    "Curls falling forward over the forehead",
    "Sides and nape: low fade",
  ],
  "m-short-curls": [
    "Top: tight, defined curls, about 3–4 cm",
    "Cut to an even, rounded shape",
    "Sides: neatly tapered",
    "A clean neckline",
  ],
  "m-wavy-side-sweep": [
    "Top: naturally wavy hair, about 7–9 cm",
    "Pushed loosely to one side, with soft movement",
    "Sides: softly tapered",
  ],
  "m-middle-part": [
    "Top: about 12 cm",
    "Parted in the centre",
    "Falling to each side of the forehead, to about eye level",
    "Sides: shorter and tapered",
  ],
  "m-modern-mullet": [
    "Top: about 6–8 cm, textured",
    "Sides: tapered short",
    "Back: left longer, reaching the collar",
  ],
  "m-shoulder-layers": [
    "Length: to the shoulders",
    "Soft layers",
    "Parted slightly off-centre",
    "Swept away from the face",
  ],
  "m-top-knot": [
    "Sides and back: clipped short (undercut)",
    "Top: left long enough to tie back",
    "Tied in a small knot at the crown",
  ],
  "m-long-curls": [
    "Curls about 12–15 cm long all over",
    "Cut into a balanced, rounded shape",
    "Falls to around the jaw",
  ],

  // -------------------------------------------------------------- women
  "w-long-layers": ["Keep my length: only the ends trimmed", "Soft layers starting at the collarbone", "No fringe"],
  "w-long-layers-curtain-bangs": [
    "Keep my length, with long layers",
    "Curtain bangs: a long fringe parted in the centre",
    "Sweeping out to each side at cheekbone level",
    "Not a full fringe straight across the forehead",
  ],
  "w-lob": [
    "Length: resting on the shoulders",
    "Slightly longer at the front",
    "A clean, blunt edge",
    "A soft bend at the ends",
    "No fringe",
  ],
  "w-blunt-bob": [
    "Length: level with the chin, well above the shoulders (neck visible)",
    "One sharp, even line",
    "Straight, sleek and smooth",
    "No fringe",
  ],
  "w-wavy-lob": [
    "Length: ends just above the shoulders",
    "Styled in loose, soft waves",
    "A relaxed texture",
    "No fringe",
  ],
  "w-face-framing-medium": [
    "Length: to the collarbone",
    "Shorter layers starting at the cheekbones",
    "Layers curving in around the face",
    "No fringe",
  ],
  "w-step-cut": [
    "Keep my length",
    "Clearly defined layered steps",
    "Each layer visibly shorter than the one beneath it",
  ],
  "w-feather-cut": [
    "Keep my length",
    "Light, wispy, feathered layers",
    "Ends flicking softly outward",
  ],
  "w-u-cut": ["Keep my length", "One length through the front", "Ends at the back curved into a soft U"],
  "w-layered-shag": [
    "Length: to the shoulders",
    "Lots of choppy layers through the crown and lengths",
    "A soft, wispy fringe",
    "A tousled finish",
  ],
  "w-pixie": [
    "Top: about 4–6 cm, with soft texture",
    "A side-swept fringe",
    "Cut close around the ears and at the nape",
  ],
  "w-side-swept-bangs-medium": [
    "Length: just past the shoulders",
    "Soft layers",
    "A long fringe swept across the forehead to one side",
  ],
  "w-v-cut": [
    "Keep my length",
    "Ends at the back cut to a soft point in the centre",
    "Sides fall shorter than the back",
    "No fringe",
  ],
  "w-face-framing-long": [
    "Keep my length",
    "Shorter front pieces starting at the chin",
    "Curving in around the face",
    "No fringe",
  ],
  "w-long-side-swept-bangs": [
    "Keep my length, with long layers",
    "A side parting",
    "A long fringe swept diagonally across the forehead to one side",
  ],
  "w-butterfly-cut": [
    "Keep my length",
    "Shorter, full layers around the face and crown",
    "Layers sweeping away from the face",
    "Blended into long layers below the shoulders",
  ],
  "w-straight-cut": ["Keep my length", "Ends cut straight across in one blunt, even line", "No layers, no fringe"],
  "w-wispy-bangs-long": [
    "Keep my length",
    "A light, thin, see-through fringe",
    "Fringe falling to just above the eyebrows",
  ],
  "w-long-curly-layers": [
    "Keep my length",
    "Layers cut so the curls stack into a rounded, balanced shape",
    "No fringe",
  ],
  "w-collarbone-cut": [
    "Length: ending at the collarbone",
    "A few soft, long layers at the ends",
    "A centre or slightly off-centre parting",
    "No fringe",
  ],
  "w-textured-pixie": [
    "Top: very short, about 3–5 cm",
    "Choppy, lifted, piecey texture",
    "A short, textured fringe",
    "Sides and nape: clipped close, ears showing",
  ],
  "w-medium-curtain-bangs": [
    "Length: to the shoulders, with soft layers",
    "Curtain bangs: a long fringe parted in the centre",
    "Sweeping out to each side at cheekbone level",
    "Middle of the forehead left showing",
  ],
  "w-wolf-cut": [
    "Heavy, choppy, shorter layers at the crown",
    "Lots of volume on top",
    "Thinning into longer, wispy ends at the shoulders",
    "A soft curtain fringe",
    "A tousled finish",
  ],
  "w-blunt-shoulder-cut": [
    "Length: exactly at the shoulders",
    "One sharp, even line",
    "Straight and sleek",
    "A centre parting",
    "No layers, no fringe",
  ],
  "w-curly-shoulder-cut": [
    "Length: defined natural curls ending at the shoulders",
    "Cut in rounded layers",
    "A full, even shape all round",
    "No fringe",
  ],
  "w-layered-bob": [
    "Length: to the chin",
    "Soft layers through the ends, for movement",
    "A slightly rounded shape",
    "A side parting",
    "No fringe",
  ],
  "w-a-line-bob": [
    "Short at the nape, angled longer toward the front",
    "Front pieces ending just below the chin",
    "Sleek finish",
    "No fringe",
  ],
  "w-french-bob": [
    "Length: ending at the jawline",
    "Softly curved ends",
    "A full, straight fringe resting at the eyebrows",
  ],
  "w-curly-bob": [
    "Length: defined natural curls cut to the chin",
    "A rounded shape",
    "Volume at the sides",
    "No fringe",
  ],
  "w-bixie": [
    "A long pixie, between a pixie and a bob",
    "Soft layers covering the ears",
    "Ending at the middle of the neck",
    "A long side-swept fringe",
    "Light texture",
  ],
};

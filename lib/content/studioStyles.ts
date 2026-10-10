// Quick-pick hairstyles for the owner's Studio page (/admin/studio).
//
// 10.10.2026. These are a STARTER set so the owner can make example images
// for the carousel and judge the image model straight away. They are not
// the customer catalogue — that list (with face shapes, hair length needed,
// upkeep and so on) is still to be drawn up and reviewed.
//
// `prompt` is what the image model is told, in barber's / stylist's terms.
// `label` is what the owner sees and what the image is filed under.

export interface StudioStyle {
  label: string;
  prompt: string;
}

export const STUDIO_STYLES: Record<"men" | "women", StudioStyle[]> = {
  men: [
    {
      label: "Textured quiff, low taper",
      prompt:
        "a short textured quiff: hair on top about 5–7 cm, lifted up and slightly back at the front with visible, piecey texture, and a low taper fade on the sides and at the nape",
    },
    {
      label: "Classic side part, taper",
      prompt:
        "a classic side part: hair on top about 5–6 cm combed neatly to one side from a clean natural parting, with tapered sides and back cut with scissors and a tidy neckline",
    },
    {
      label: "Textured crop, mid fade",
      prompt:
        "a short textured crop: choppy, textured hair on top about 3–4 cm pushed slightly forward with a short uneven fringe, and a clean mid skin fade on the sides and back",
    },
    {
      label: "Crew cut",
      prompt:
        "a crew cut: short hair on top about 2–3 cm, slightly longer at the front hairline, with short tapered sides and back",
    },
    {
      label: "Buzz cut",
      prompt: "an even buzz cut: the hair clipped very short all over, about 6 mm, with a sharp, clean hairline",
    },
    {
      label: "Slick back, undercut",
      prompt:
        "a slicked-back undercut: hair on top about 8–10 cm combed straight back with a slight shine, and short clipped sides and back disconnected from the top",
    },
    {
      label: "Pompadour, low fade",
      prompt:
        "a modern pompadour: hair on top about 8–10 cm swept up and back with height at the front, and a low fade on the sides",
    },
    {
      label: "Medium layered flow",
      prompt:
        "a medium-length layered cut: hair about 10–12 cm on top and around the ears, swept back and to the side with natural movement, the sides left long enough to tuck behind the ears",
    },
    {
      label: "Curly top, taper fade",
      prompt:
        "a curly top with a taper fade: defined natural curls on top about 5–7 cm, with the sides and back tapered short and a clean neckline",
    },
    {
      label: "Short spiky, taper",
      prompt:
        "short spiky hair: hair on top about 3–5 cm styled upward into soft textured spikes, with tapered sides and back",
    },
    {
      label: "Messy fringe, taper",
      prompt:
        "a messy textured fringe: hair on top about 6–8 cm falling forward over the forehead in loose, textured strands, with a low taper on the sides",
    },
    {
      label: "Ivy League",
      prompt:
        "an Ivy League cut: a neat short cut with about 4–5 cm on top, side-parted and brushed slightly up at the front, with short tapered sides",
    },
  ],
  women: [
    {
      label: "Long layers",
      prompt:
        "long layered hair: length falling below the shoulders to the chest, with long, soft layers starting at the collarbone and smooth, healthy ends",
    },
    {
      label: "Long layers, curtain bangs",
      prompt:
        "long layered hair with curtain bangs: length below the shoulders, soft layers, and a centre-parted fringe that sweeps out to each side of the face at cheekbone level",
    },
    {
      label: "Shoulder-length lob",
      prompt:
        "a long bob (lob): hair cut to rest on the shoulders, slightly longer at the front, with a clean blunt edge and a soft bend at the ends",
    },
    {
      label: "Blunt bob, chin length",
      prompt: "a chin-length blunt bob: straight hair cut to one sharp, even line at the jaw, sleek and smooth",
    },
    {
      label: "Wavy lob",
      prompt: "a wavy long bob: hair cut to just above the shoulders and styled in loose, soft waves with a relaxed texture",
    },
    {
      label: "Face-framing layers",
      prompt:
        "medium-length hair with face-framing layers: length to the collarbone, with shorter layers beginning at the cheekbones and curving in around the face",
    },
    {
      label: "Step cut",
      prompt:
        "a step cut: long hair cut in clearly defined layered steps, each layer visibly shorter than the one beneath it, with volume through the lengths",
    },
    {
      label: "Feather cut",
      prompt:
        "a feather cut: long hair with light, wispy, feathered layers that flick softly outward at the ends, giving a soft, airy outline",
    },
    {
      label: "U-cut, long",
      prompt: "long straight hair with a U-shaped cut at the back: one length through the front, curving to a soft U at the ends",
    },
    {
      label: "Layered shag",
      prompt:
        "a shoulder-length shag: lots of choppy layers through the crown and lengths, with a soft wispy fringe and a tousled finish",
    },
    {
      label: "Pixie cut",
      prompt:
        "a pixie cut: short hair, about 4–6 cm on top with soft texture and a side-swept fringe, cut close around the ears and at the nape",
    },
    {
      label: "Side-swept bangs, medium",
      prompt:
        "medium-length hair with side-swept bangs: length just past the shoulders with soft layers, and a long fringe swept across the forehead to one side",
    },
  ],
};

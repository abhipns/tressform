// The example cards on the home page ("One photo in. Five haircuts to
// compare.").
//
// Each entry is ONE PERSON: the photo they started with and up to five
// Tressform previews made from that same photo in the owner's Studio.
//
// 11.10.2026: the first two people are the man and the woman from the
// owner's model comparison of 10.10.2026. Both are shown in their Nano
// Banana pictures, the model customers get. (The man's row first used his
// Flux pictures; they were swapped the same day, when Flux was dropped for
// changing people's faces.) This section matters more once the free
// preview is switched off, because it becomes the visitor's only look at
// what they are buying.
//
// 11.10.2026 (later): two more people from the owner's Studio, a woman with
// long curly hair and a man in his forties with greying hair and a goatee.
// His five pictures are the second batch: the first gave him a full beard
// in three of five, which is what the facial-hair wording in
// lib/integrations/falai.ts was changed to stop. With four people the
// section is now the moving strip.
//
// 11.10.2026 (night): four more, eight in all, which is where the owner
// stops: an older man with long grey hair, a young man with straight hair,
// a woman in her forties and a woman with very long straight hair. The
// order below alternates men and women and puts the four newest first.
// Two of the last woman's pictures (A-line bob, wavy lob) came out longer
// than those cuts really are; the wording for both was tightened in
// lib/content/hairstyles.ts the same night, and the two pictures can be
// remade and swapped.
//
// 12.10.2026: a ninth person, the owner's new hero model (an AI-made man
// with shoulder-length hair; the owner's own Studio pictures), put first.
//
// TO ADD A PERSON: put six pictures in public/carousel/ (4:5 portrait, the
// face in the middle; 560×700 is plenty) and add an entry below. With four
// or more people the section turns into a moving strip by itself.
//
// Only pictures the business has the right to show: model photos, or a
// customer's with their written permission to appear on the site (that is
// a separate permission from the one given to analyse a photo).

export interface CarouselPreview {
  /** A file in public/carousel/, written as "/carousel/name.jpg". */
  src: string;
  /** The hairstyle, as it is named in the hairstyle list. */
  style: string;
}

export interface CarouselPerson {
  id: string;
  /** For screen readers, e.g. "a man with curly hair". Not shown. */
  who: string;
  original: string;
  previews: CarouselPreview[];
}

export const CAROUSEL_PEOPLE: CarouselPerson[] = [
  {
    id: "man-5",
    who: "a man with shoulder-length wavy black hair and stubble",
    original: "/carousel/man-5-original.jpg",
    previews: [
      { src: "/carousel/man-5-slick-back.jpg", style: "Slick back, undercut" },
      { src: "/carousel/man-5-top-knot.jpg", style: "Top knot, undercut" },
      { src: "/carousel/man-5-side-swept-fringe.jpg", style: "Side-swept fringe, taper" },
      { src: "/carousel/man-5-mullet.jpg", style: "Modern mullet, taper" },
      { src: "/carousel/man-5-comb-over.jpg", style: "Comb over, mid fade" },
    ],
  },
  {
    id: "woman-4",
    who: "a woman with very long straight black hair",
    original: "/carousel/woman-4-original.jpg",
    previews: [
      { src: "/carousel/woman-4-textured-pixie.jpg", style: "Textured pixie" },
      { src: "/carousel/woman-4-bixie.jpg", style: "Long pixie (bixie)" },
      { src: "/carousel/woman-4-side-swept-bangs.jpg", style: "Side-swept bangs, medium" },
      { src: "/carousel/woman-4-a-line-bob.jpg", style: "A-line bob" },
      { src: "/carousel/woman-4-wavy-lob.jpg", style: "Wavy lob" },
    ],
  },
  {
    id: "man-4",
    who: "a young man with straight black hair",
    original: "/carousel/man-4-original.jpg",
    previews: [
      { src: "/carousel/man-4-pompadour.jpg", style: "Pompadour, low fade" },
      { src: "/carousel/man-4-high-and-tight.jpg", style: "High and tight" },
      { src: "/carousel/man-4-messy-fringe.jpg", style: "Messy fringe, taper" },
      { src: "/carousel/man-4-comb-over.jpg", style: "Comb over, mid fade" },
      { src: "/carousel/man-4-short-back-sides.jpg", style: "Short back and sides" },
    ],
  },
  {
    id: "woman-2",
    who: "a woman with long curly hair",
    original: "/carousel/woman-2-original.jpg",
    previews: [
      { src: "/carousel/woman-2-curly-bob.jpg", style: "Curly bob" },
      { src: "/carousel/woman-2-bixie.jpg", style: "Long pixie (bixie)" },
      { src: "/carousel/woman-2-french-bob.jpg", style: "French bob with fringe" },
      { src: "/carousel/woman-2-pixie.jpg", style: "Pixie cut" },
      { src: "/carousel/woman-2-textured-pixie.jpg", style: "Textured pixie" },
    ],
  },
  {
    id: "man-3",
    who: "an older man with long grey hair",
    original: "/carousel/man-3-original.jpg",
    previews: [
      { src: "/carousel/man-3-side-part.jpg", style: "Classic side part, taper" },
      { src: "/carousel/man-3-top-knot.jpg", style: "Top knot, undercut" },
      { src: "/carousel/man-3-side-swept-fringe.jpg", style: "Side-swept fringe, taper" },
      { src: "/carousel/man-3-middle-part.jpg", style: "Middle part curtains" },
      { src: "/carousel/man-3-wavy-side-sweep.jpg", style: "Wavy side sweep, taper" },
    ],
  },
  {
    id: "woman-3",
    who: "a woman in her forties with wavy brown hair",
    original: "/carousel/woman-3-original.jpg",
    previews: [
      { src: "/carousel/woman-3-pixie.jpg", style: "Pixie cut" },
      { src: "/carousel/woman-3-french-bob.jpg", style: "French bob with fringe" },
      { src: "/carousel/woman-3-layered-shag.jpg", style: "Layered shag" },
      { src: "/carousel/woman-3-curtain-bangs.jpg", style: "Long layers, curtain bangs" },
      { src: "/carousel/woman-3-butterfly-cut.jpg", style: "Butterfly cut" },
    ],
  },
  {
    id: "man-1",
    who: "a man with curly hair",
    original: "/carousel/man-1-original.jpg",
    previews: [
      { src: "/carousel/man-1-textured-quiff.jpg", style: "Textured quiff, low taper" },
      { src: "/carousel/man-1-side-part.jpg", style: "Classic side part, taper" },
      { src: "/carousel/man-1-textured-crop.jpg", style: "Textured crop, mid fade" },
      { src: "/carousel/man-1-curly-top.jpg", style: "Curly top, taper fade" },
      { src: "/carousel/man-1-messy-fringe.jpg", style: "Messy fringe, taper" },
    ],
  },
  {
    id: "woman-1",
    who: "a woman with long plaited hair",
    original: "/carousel/woman-1-original.jpg",
    previews: [
      { src: "/carousel/woman-1-step-cut.jpg", style: "Step cut" },
      { src: "/carousel/woman-1-lob.jpg", style: "Shoulder-length lob" },
      { src: "/carousel/woman-1-layered-shag.jpg", style: "Layered shag" },
      { src: "/carousel/woman-1-side-swept-bangs.jpg", style: "Side-swept bangs, medium" },
      { src: "/carousel/woman-1-pixie.jpg", style: "Pixie cut" },
    ],
  },
  {
    id: "man-2",
    who: "a man with greying hair and a goatee",
    original: "/carousel/man-2-original.jpg",
    previews: [
      { src: "/carousel/man-2-side-part.jpg", style: "Classic side part, taper" },
      { src: "/carousel/man-2-textured-crop.jpg", style: "Textured crop, mid fade" },
      { src: "/carousel/man-2-crew-cut.jpg", style: "Crew cut" },
      { src: "/carousel/man-2-short-back-sides.jpg", style: "Short back and sides" },
      { src: "/carousel/man-2-buzz-fade.jpg", style: "Buzz cut, skin fade" },
    ],
  },
];

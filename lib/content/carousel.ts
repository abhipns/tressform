// The example cards on the home page ("One photo in. Five haircuts to
// compare.").
//
// Each entry is ONE PERSON: the photo they started with and up to five
// Tressform previews made from that same photo in the owner's Studio.
//
// 11.10.2026: the first two people are the man and the woman from the
// owner's model comparison of 10.10.2026 — his pictures made on Flux, hers
// on Nano Banana, the models chosen for each. The owner is adding more
// people; this section matters more once the free preview is switched off,
// because it becomes the visitor's only look at what they are buying.
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
    id: "man-1",
    who: "a man with curly hair",
    original: "/carousel/man-1-original.jpg",
    previews: [
      { src: "/carousel/man-1-textured-quiff.jpg", style: "Textured quiff, low taper" },
      { src: "/carousel/man-1-side-part.jpg", style: "Classic side part, taper" },
      { src: "/carousel/man-1-buzz-cut.jpg", style: "Buzz cut" },
      { src: "/carousel/man-1-short-spiky.jpg", style: "Short spiky, taper" },
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
];

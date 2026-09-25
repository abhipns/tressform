// Real-photo content for the homepage carousel ("Real Portraits. Multiple
// AI Transformations Each.").
//
// HOW TO ADD PHOTOS:
//   1. Drop your image files into public/carousel/ (any name, .jpg/.png/.webp).
//   2. Add one entry below per customer "session" — each session renders as
//      one card in the carousel, showing up to 6 photos in a grid.
//   3. Save this file and refresh — no other code changes needed.
//
// Until you add at least one session here, the carousel falls back to the
// original placeholder illustrations so the homepage never looks broken.
//
// NOTE: only use photos you have the customer's permission to display
// publicly (this ties to the "Never used for AI training" / privacy
// commitments in the Trust section) — this is marketing/testimonial use,
// which is a separate consent from the analysis consent captured in the
// upload flow.

export interface CarouselPhoto {
  /** Path under /public — e.g. a file at public/carousel/aarav-1.jpg is "/carousel/aarav-1.jpg". */
  src: string;
  /** Short label shown on the photo, e.g. "AI Generated" or "Before". */
  tag: string;
  /** Alt text for accessibility. */
  alt: string;
}

export interface CarouselSession {
  id: string;
  /** Caption under the card, e.g. "Aarav · 5 AI transformations". */
  caption: string;
  /** 3–6 photos recommended; the grid adapts to however many you give it. */
  photos: CarouselPhoto[];
}

export const CAROUSEL_SESSIONS: CarouselSession[] = [
  // Example — copy this block, point `src` at your own file in
  // public/carousel/, then delete this comment once you have real entries:
  //
  // {
  //   id: "aarav",
  //   caption: "Aarav · 5 AI transformations",
  //   photos: [
  //     { src: "/carousel/aarav-1.jpg", tag: "AI Generated", alt: "Aarav — textured quiff preview" },
  //     { src: "/carousel/aarav-2.jpg", tag: "AI Generated", alt: "Aarav — classic crop preview" },
  //     { src: "/carousel/aarav-3.jpg", tag: "AI Generated", alt: "Aarav — curl definition preview" },
  //   ],
  // },
];

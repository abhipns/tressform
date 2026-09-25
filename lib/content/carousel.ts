// Real-photo content for the homepage carousel ("Real Portraits. Multiple
// AI Transformations Each.").
//
// HOW TO ADD PHOTOS — two ways:
//   A) Edit this file directly: drop image files into public/carousel/ (any
//      name, .jpg/.png/.webp), add one entry below per customer "session"
//      (each session = one card, up to 6 photos), save and refresh.
//   B) Upload without touching code: visit /admin/carousel (per doc thread
//      f3588221-19c8) — it posts to app/api/admin/carousel, which writes to
//      the carousel_sessions/carousel_photos tables (db/schema.sql). NOTE:
//      this component still only reads the static array below — sessions
//      added via the admin page won't appear here automatically yet.
//      Wiring this file to fetch from that table (or replacing it with a
//      server component that queries carousel_sessions directly) is the
//      next step; until then, mirror anything uploaded there into the array
//      below if you want it live on the homepage immediately.
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

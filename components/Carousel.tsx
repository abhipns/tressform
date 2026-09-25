// Part C — marquee of before/AI-generated portrait sets.
//
// Renders real photos from lib/content/carousel.ts once you've added any —
// see that file for how to add your own. Until then, it falls back to the
// original generated placeholder illustrations (no real photos used) so the
// homepage never looks broken.
//
// 24.09.2026: eyebrow copy changed from "Real Portraits. Multiple AI
// Transformations Each." to "See Your Real Self in Multiple Hairstyles."
// per user feedback.

import { CAROUSEL_SESSIONS, type CarouselSession } from "@/lib/content/carousel";

const PALETTES: [string, string][] = [
  ["#8FE3C3", "#5FC9A8"],
  ["#C9B8EA", "#8F6FC9"],
  ["#F3D9B1", "#E7B76C"],
  ["#B9D8F0", "#7FB4DE"],
  ["#F0C4C4", "#D98E8E"],
  ["#DDEAC0", "#AFCB7C"],
];

const HAIR: Record<string, string> = {
  base: '<path d="M28 46c0-16 10-28 22-28s22 12 22 28c0-6-4-10-10-11 2-6-2-11-8-11-7 0-9 6-9 10-5 1-9 5-9 12-2-1-3-1-8 0Z" fill="#2E2438"/>',
  quiff:
    '<path d="M27 44c1-18 11-30 23-30 14 0 22 14 22 28-3-10-11-16-19-14 4-8-2-14-10-12-8 2-11 10-8 16-4-1-7 4-8 12Z" fill="#3B2C4C"/>',
  crop: '<path d="M28 40c0-14 9-24 22-24s22 10 22 24c-2-6-9-10-22-10s-20 4-22 10Z" fill="#241A30"/>',
  curly:
    '<circle cx="34" cy="34" r="8" fill="#3B2C4C"/><circle cx="44" cy="24" r="9" fill="#3B2C4C"/><circle cx="56" cy="24" r="9" fill="#3B2C4C"/><circle cx="66" cy="34" r="8" fill="#3B2C4C"/><circle cx="50" cy="20" r="9" fill="#3B2C4C"/>',
  fade: '<path d="M30 42c0-15 9-26 20-26s20 11 20 26c-2-8-9-13-20-13s-18 5-20 13Z" fill="#2E2438"/>',
  long: '<path d="M26 50c-2-20 8-34 24-34s26 14 24 34c-1-4-4-6-7-6 2 14 0 30-2 42h-4c1-14 1-28-2-36-3 8-3 22-2 36h-4c-2-12-4-28-3-42-3 0-6 2-7 6Z" fill="#3B2C4C"/>',
};

function avatarSvgMarkup(hue1: string, hue2: string, hairPath: string, gradId: string) {
  return `<svg viewBox="0 0 100 128" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${hue1}"/><stop offset="1" stop-color="${hue2}"/></linearGradient></defs>
    <rect width="100" height="128" fill="url(#${gradId})"/>
    <circle cx="50" cy="58" r="22" fill="#F3DCC4"/>
    <path d="M50 96c-16 0-28 10-28 24v8h56v-8c0-14-12-24-28-24Z" fill="#F3DCC4"/>
    ${hairPath}
  </svg>`;
}

const HAIR_STYLES = [HAIR.base, HAIR.quiff, HAIR.crop, HAIR.curly, HAIR.fade, HAIR.long];

// Part A.3 — box 1 keeps a short text label ("Model"); boxes 2–6 no longer
// repeat "AI Generated" as text six times per card (30+ times on screen at
// once). Same disclosure, shown once as a quiet star-icon pill instead.
function TagBadge({ tag }: { tag: string }) {
  const isPlainLabel = tag.trim().toLowerCase() === "model";
  if (isPlainLabel) {
    return (
      <span className="relative z-[2] m-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-white backdrop-blur-[2px]">
        {tag}
      </span>
    );
  }
  return (
    <span
      role="img"
      aria-label={tag}
      title={tag}
      className="relative z-[2] m-1 flex h-[16px] w-[16px] items-center justify-center rounded-full bg-black/55 text-mint backdrop-blur-[2px]"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5">
        <path d="M10 1 12.12 7.09 18.56 7.22 13.42 11.11 15.29 17.28 10 13.6 4.71 17.28 6.58 11.11 1.44 7.22 7.88 7.09Z" />
      </svg>
    </span>
  );
}

function buildPlaceholderCard(seed: number, keyPrefix: string) {
  const boxes = HAIR_STYLES.map((hair, i) => {
    const pal = PALETTES[(seed + i) % PALETTES.length];
    return { hair, pal, tag: i === 0 ? "Model" : "AI Generated" };
  });

  return (
    <div className="w-[460px] shrink-0 rounded-md2 bg-surface p-3.5 shadow-card" key={`placeholder-${keyPrefix}-${seed}`}>
      <div className="grid grid-cols-3 gap-2.5">
        {boxes.map((b, i) => (
          <div key={i} className="relative flex aspect-[0.78/1] items-end overflow-hidden rounded-[10px]">
            <span
              className="absolute inset-0 h-full w-full"
              dangerouslySetInnerHTML={{
                __html: avatarSvgMarkup(b.pal[0], b.pal[1], b.hair, `g${keyPrefix}${seed}-${i}`),
              }}
            />
            <TagBadge tag={b.tag} />
          </div>
        ))}
      </div>
    </div>
  );
}

function buildPhotoCard(session: CarouselSession, keyPrefix: string) {
  return (
    <div className="w-[460px] shrink-0 rounded-md2 bg-surface p-3.5 shadow-card" key={`${keyPrefix}-${session.id}`}>
      <div className="grid grid-cols-3 gap-2.5">
        {session.photos.map((photo, i) => (
          <div key={i} className="relative flex aspect-[0.78/1] items-end overflow-hidden rounded-[10px] bg-bg-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt={photo.alt} className="absolute inset-0 h-full w-full object-cover" />
            <TagBadge tag={photo.tag} />
          </div>
        ))}
      </div>
      <div className="px-1.5 pb-1 pt-2 text-[12px] font-medium text-ink-muted">{session.caption}</div>
    </div>
  );
}

export default function Carousel() {
  const hasRealPhotos = CAROUSEL_SESSIONS.length > 0;

  const cards = hasRealPhotos
    ? [
        ...CAROUSEL_SESSIONS.map((s) => buildPhotoCard(s, "a")),
        ...CAROUSEL_SESSIONS.map((s) => buildPhotoCard(s, "b")),
      ]
    : [
        // Two IDENTICAL sets of the same 11 seeds — the marquee track translates
        // by exactly -50% (see globals.css's scroll-left keyframe), so the
        // second half must be a pixel-for-pixel duplicate of the first for the
        // loop to be seamless. The old version seeded the second half at
        // i+100 (different avatars/colors), which is what caused the visible
        // jump at the card 8 → card 9 boundary. Bumped from 8 to 11 cards (+3)
        // per feedback, larger card size above makes the extra cards read as
        // one continuous, unbroken strip rather than a fixed 8-card row.
        ...Array.from({ length: 11 }, (_, i) => buildPlaceholderCard(i, "a")),
        ...Array.from({ length: 11 }, (_, i) => buildPlaceholderCard(i, "b")),
      ];

  return (
    <section id="browse" className="overflow-hidden bg-bg pb-2 pt-9">
      <div className="wrap mb-4 text-center">
        <p className="eyebrow">See Your Real Self in Multiple Hairstyles.</p>
      </div>
      <div
        className="w-full overflow-hidden"
        style={{ maskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)" }}
      >
        {/* Cards grew from 360px to 460px (per feedback) — duration bumped
            64s → 80s to hold the same px/sec scroll speed rather than
            suddenly speeding up the marquee. */}
        <div className="flex w-max animate-[scroll-left_80s_linear_infinite] gap-5 hover:[animation-play-state:paused]">
          {cards}
        </div>
      </div>
    </section>
  );
}

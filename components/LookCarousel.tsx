"use client";

// "Your looks" — the customer's hairstyles as a carousel (14.10.2026, the
// owner's redesign: "none of the customers have a lot of time to read the
// details"). StylePicks.tsx decides what goes in it; this file only draws.
//
//   LookCarousel  after a pack is bought: the best-matched cuts on the
//                 customer's own photo, front view only, numbered 1, 2, 3…
//                 (the numbers friends comment with when the customer shares
//                 them). Tapping a look opens its full card.
//   LockedLooks   before a pack: the customer's own selfie, blurred, under
//                 locked tiles named with their top styles, and the packs.
//                 No AI picture is made for this (owner's choice: no cost
//                 before payment).

import PictureOffer from "@/components/PictureOffer";

export interface LookItem {
  id: string;
  rank: number;
  name: string;
  state: "loading" | "done" | "failed";
  imageUrl?: string;
  /** "Ready now", or how long to grow first. */
  ready: string;
  readyNow: boolean;
}

const strip =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-1 sm:px-1 [&::-webkit-scrollbar]:hidden";
const tileWidth = "w-[64%] shrink-0 snap-start sm:w-[230px]";

function Number({ n }: { n: number }) {
  return (
    <span className="absolute left-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#C79A3D] text-[17px] font-bold text-white shadow-card">
      {n}
    </span>
  );
}

function ReadyChip({ text, now }: { text: string; now: boolean }) {
  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
        now ? "bg-mint-pale text-mint-deep" : "bg-lilac/20 text-header-dark"
      }`}
    >
      {text}
    </span>
  );
}

export function LookCarousel({
  items,
  photo,
  onOpen,
  onRetry,
}: {
  items: LookItem[];
  photo: string | null;
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  return (
    <ol className={strip} aria-label="Your looks">
      {items.map((item) => (
        <li key={item.id} className={tileWidth}>
          {item.state === "done" && item.imageUrl ? (
            <button
              type="button"
              onClick={() => onOpen(item.id)}
              className="group relative block aspect-[3/4] w-full overflow-hidden rounded-[18px] bg-line text-left shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-deep"
              aria-label={`Look ${item.rank}: ${item.name}. Open it`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover object-top transition group-hover:scale-[1.02]" />
              <Number n={item.rank} />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-[13px] font-semibold text-white">
                Tap to see all sides
              </span>
            </button>
          ) : (
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[18px] bg-line">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
              )}
              <Number n={item.rank} />
              {item.state === "loading" ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[24%] animate-[scan-down_2.2s_ease-in-out_infinite] border-b-2 border-white/90 bg-gradient-to-b from-transparent to-mint/45 motion-reduce:hidden"
                  />
                  <p className="absolute inset-x-0 bottom-0 bg-header-dark/75 px-3 py-2.5 text-center text-[13px] font-medium text-white">
                    Making this look…
                  </p>
                </>
              ) : (
                <div className="absolute inset-x-0 bottom-0 bg-header-dark/80 px-3 py-2.5 text-center text-[13px] text-white">
                  This one didn&apos;t work.{" "}
                  <button type="button" className="font-semibold underline" onClick={() => onRetry(item.id)}>
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
          <p className="mt-2 text-[15px] font-semibold leading-snug text-ink-heading">{item.name}</p>
          <ReadyChip text={item.ready} now={item.readyNow} />
        </li>
      ))}
    </ol>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" strokeLinecap="round" />
    </svg>
  );
}

// 26.10.2026: each locked look also offers "See this on your face" — the
// front ₹25 or the Full look ₹70, for that one hairstyle (PictureOffer).
export function LockedLooks({
  photo,
  photoId,
  names,
  packs,
}: {
  photo: string | null;
  /** The customer's photo, for buying single pictures. Without it, only the packs are offered. */
  photoId?: string | null;
  names: { styleId?: string; name: string; ready: string; readyNow: boolean }[];
  packs: { tier: string; count: number; rupees: string }[];
}) {
  const first = packs[0];
  return (
    <div id="get-previews" className="scroll-mt-24">
      <ol className={strip} aria-label="Your looks, locked">
        {names.map((look, i) => (
          <li key={look.name} className={tileWidth}>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[18px] bg-header-dark">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-[14px]" />
              )}
              <Number n={i + 1} />
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm">
                  <LockIcon />
                </span>
                <span className="text-[13.5px] font-semibold drop-shadow">Your photo, this cut</span>
              </span>
            </div>
            <p className="mt-2 text-[15px] font-semibold leading-snug text-ink-heading">{look.name}</p>
            <ReadyChip text={look.ready} now={look.readyNow} />
            {photoId && look.styleId && <PictureOffer styleId={look.styleId} photoId={photoId} />}
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-[20px] bg-[#16261C] px-5 py-5 text-white sm:px-6">
        <p className="text-[18px] font-semibold leading-tight text-white">See these cuts on your own photo</p>
        <p className="mt-1.5 text-[14.5px] leading-[1.5] text-white/75">
          We make your best-matched looks right away. Tap any look to see it from both sides and the back, with the words
          for your barber.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {packs.map((pack, i) => (
            <a
              key={pack.tier}
              href={`/checkout?tier=${pack.tier}`}
              className={`${i === 0 ? "btn-amber" : "btn-secondary"} w-full !px-5 !py-3 !text-[15.5px]`}
            >
              {i === 0 ? `Unlock your ${pack.count} looks · ₹${pack.rupees}` : `${pack.count} looks · ₹${pack.rupees}`}
            </a>
          ))}
        </div>
        {first && <p className="mt-3 text-[13px] text-white/55">One-time payment. You come straight back here.</p>}
      </div>
    </div>
  );
}

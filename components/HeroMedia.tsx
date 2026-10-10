"use client";

// The picture half of the hero: the analysis footage with the barber card
// laid over its corner. Kept separate from Hero.tsx because the card has to
// follow the video — when the clip changes from the woman to the man, the
// example cut on the card changes with it (a quiff written under a woman's
// face would look careless).
//
// The card's contents are examples and are labelled so. The real card is
// written per customer from their own analysis.

import { useCallback, useState } from "react";
import HeroVideoShuffle from "./HeroVideoShuffle";

type Line = { label: string; parts: (string | { n: string })[] };

// Index matches HeroVideoShuffle's clip order: 0 = woman, 1 = man.
const CARDS: { style: string; lines: Line[] }[] = [
  {
    style: "Long layers, face-framing",
    lines: [
      { label: "Length", parts: ["Trim ", { n: "5" }, " cm, to the collarbone"] },
      { label: "Layers", parts: ["Long, starting at the chin"] },
      { label: "Front", parts: ["Face-framing from the cheekbone"] },
    ],
  },
  {
    style: "Textured quiff, low taper",
    lines: [
      { label: "Top", parts: [{ n: "5–7" }, " cm, scissor cut"] },
      { label: "Sides", parts: ["Guard ", { n: "2" }, " fading to ", { n: "0.5" }] },
      { label: "Back", parts: ["Tapered neckline"] },
    ],
  },
];

function BarberCard({ index }: { index: number }) {
  const card = CARDS[index] ?? CARDS[0];
  return (
    <div className="w-[min(300px,80vw)] rounded-[14px] bg-bg-soft px-5 pb-4 pt-4 text-ink-heading shadow-[0_24px_50px_-18px_rgba(0,0,0,0.65)] ring-1 ring-black/5">
      <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-2.5">
        <span className="font-heading text-[17px] font-semibold leading-none">Barber card</span>
        <span className="text-[11.5px] text-ink-muted">Example</span>
      </div>
      <p className="mt-2.5 text-[13px] leading-snug text-ink-body">{card.style}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-[13px] leading-snug">
        {card.lines.map((line) => (
          <div key={line.label} className="contents">
            <dt className="text-ink-muted">{line.label}</dt>
            <dd>
              {line.parts.map((part, i) =>
                typeof part === "string" ? (
                  part
                ) : (
                  <span key={i} className="font-heading text-[19px] font-semibold">
                    {part.n}
                  </span>
                )
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function HeroMedia() {
  const [index, setIndex] = useState<number | null>(null);
  const handleChange = useCallback((i: number) => setIndex(i), []);

  return (
    <div className="relative sm:pb-20 lg:pb-24">
      <div className="aspect-video w-full overflow-hidden rounded-[22px] bg-mint-pale shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
        <HeroVideoShuffle onActiveChange={handleChange} />
      </div>
      {/* Phones: the card sits just under the video, tucked a little over its
          edge. Wider screens: it overlaps the video's lower-left corner. */}
      <div
        className={`relative -mt-7 ml-3 w-fit -rotate-[3deg] transition-opacity duration-500 sm:absolute sm:bottom-0 sm:left-8 sm:mt-0 sm:ml-0 sm:-rotate-[4deg] lg:-left-10 ${
          index === null ? "opacity-0" : "opacity-100"
        }`}
      >
        <BarberCard index={index ?? 0} />
      </div>
    </div>
  );
}

"use client";

// The picture on a "Hairstyles of the World" card (26.10.2026, owner's
// approved layout). On a laptop, hovering jumps the picture to the model's
// plain "before" photo, then fades (0.6 s) into the hairstyle, with a small
// "Before" / "After" label. On phones each card plays this by itself while
// it is on screen, every few seconds, the cards a little apart from each
// other. Until a style has its picture, a neat placeholder shows instead.

import { useEffect, useRef, useState } from "react";

type Phase = "rest" | "before" | "after";

const BEFORE_MS = 450;
const LOOP_MS = 5200;

export function PicturePlaceholder({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#E7ECE8] text-ink-muted">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
        <circle cx="12" cy="9" r="4" />
        <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
        <path d="M8.2 7.2c1-1.6 2.3-2.4 3.8-2.4 2.3 0 3.9 1.6 4.2 3.6" />
      </svg>
      <span className="px-4 text-center text-[12.5px] font-semibold">{label}</span>
    </div>
  );
}

export default function BeforeAfter({
  before,
  after,
  alt,
  index = 0,
  className = "",
}: {
  before: string | null;
  after: string | null;
  alt: string;
  /** The card's place in the grid, so phones play the cards one after another. */
  index?: number;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>("rest");
  const box = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const canPlay = Boolean(before && after);

  function clear() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }
  function play() {
    if (!canPlay) return;
    clear();
    setPhase("before");
    timers.current.push(window.setTimeout(() => setPhase("after"), BEFORE_MS));
    timers.current.push(window.setTimeout(() => setPhase("rest"), BEFORE_MS + 1900));
  }

  // Phones (no hover): play by itself while on screen, staggered by position.
  useEffect(() => {
    if (!canPlay || !box.current) return;
    const hover = window.matchMedia("(hover: hover)").matches;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (hover || still) return;
    let loop: number | null = null;
    let start: number | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start = window.setTimeout(() => {
            play();
            loop = window.setInterval(play, LOOP_MS);
          }, (index % 6) * 800 + 400);
        } else {
          if (start) window.clearTimeout(start);
          if (loop) window.clearInterval(loop);
          start = loop = null;
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(box.current);
    return () => {
      observer.disconnect();
      if (start) window.clearTimeout(start);
      if (loop) window.clearInterval(loop);
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPlay, index]);

  return (
    <div
      ref={box}
      className={`relative aspect-[4/5] w-full overflow-hidden bg-[#EEF0EE] ${className}`}
      onMouseEnter={() => window.matchMedia("(hover: hover)").matches && play()}
      onMouseLeave={() => {
        clear();
        setPhase("rest");
      }}
    >
      {after ? (
        <>
          {before && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={before} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={after}
            alt={alt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: phase === "before" ? 0 : 1,
              transition: phase === "after" ? "opacity 0.6s ease" : "none",
            }}
          />
          {phase !== "rest" && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-0.5 text-[11.5px] font-semibold uppercase tracking-[.04em] text-white">
              {phase === "before" ? "Before" : "After"}
            </span>
          )}
        </>
      ) : (
        <PicturePlaceholder label="Picture coming soon" />
      )}
    </div>
  );
}

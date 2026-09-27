"use client";

import { useEffect, useRef, useState } from "react";

// Two real hero videos (man + woman going through the AI face-analysis flow),
// muted, looping forever, played back-to-back.
//
// 27.09.2026 (later same day, 2nd change): replaced the earlier
// shuffle-with-no-repeat logic with a strict alternation (0,1,0,1,...), just
// randomizing which one plays first. The old approach could, depending on
// React's render timing, occasionally show the same clip twice in a row —
// this version can't, since there are only ever two possible next states and
// we always flip to the other one. Also added a short fade transition: the
// current frame fades to the card's background before the next clip's first
// frame is ready, then fades that new frame in, instead of hard-cutting.
const VIDEOS = [
  { src: "/hero-analysis-woman.mp4", poster: "/hero-analysis-woman-poster.jpg" },
  { src: "/hero-analysis-man.mp4", poster: "/hero-analysis-man-poster.jpg" },
];

const FADE_MS = 350;

export default function HeroVideoShuffle() {
  const [activeIndex, setActiveIndex] = useState(() => (Math.random() < 0.5 ? 0 : 1));
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pendingSwitchRef = useRef<number | null>(null);

  const current = VIDEOS[activeIndex];

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.load();
    el.play().catch(() => {
      // Autoplay can be blocked in rare cases (e.g. low-power mode); poster stays visible.
    });
  }, [current.src]);

  function handleEnded() {
    // Fade the current frame out first, then swap the source once it's hidden
    // so the cut happens behind the fade rather than as a visible jump.
    setVisible(false);
    pendingSwitchRef.current = window.setTimeout(() => {
      setActiveIndex((prev) => (prev === 0 ? 1 : 0));
    }, FADE_MS);
  }

  function handleLoadedData() {
    // New clip's first frame is ready — fade it in.
    setVisible(true);
  }

  useEffect(() => {
    return () => {
      if (pendingSwitchRef.current !== null) {
        window.clearTimeout(pendingSwitchRef.current);
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={`h-full w-full object-cover transition-opacity duration-[350ms] ease-in-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      poster={current.poster}
      autoPlay
      muted
      playsInline
      onEnded={handleEnded}
      onLoadedData={handleLoadedData}
    >
      <source src={current.src} type="video/mp4" />
    </video>
  );
}

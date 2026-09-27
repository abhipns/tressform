"use client";

import { useEffect, useRef, useState } from "react";

// Two real hero videos (man + woman going through the AI face-analysis flow),
// played one after another in randomized order, muted, looping forever.
// A same-video repeat back-to-back is deliberately avoided when reshuffling,
// so with only 2 clips this behaves as: random first pick, then alternate.
const VIDEOS = [
  { src: "/hero-analysis-woman.mp4", poster: "/hero-analysis-woman-poster.jpg" },
  { src: "/hero-analysis-man.mp4", poster: "/hero-analysis-man-poster.jpg" },
];

function shuffle(indices: number[]): number[] {
  const arr = [...indices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function HeroVideoShuffle() {
  const [order, setOrder] = useState<number[]>(() => shuffle([0, 1]));
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = VIDEOS[order[index]];

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.load();
    el.play().catch(() => {
      // Autoplay can be blocked in rare cases (e.g. low-power mode); poster stays visible.
    });
  }, [current.src]);

  function handleEnded() {
    const justPlayed = order[index];
    const next = index + 1;
    if (next < order.length) {
      setIndex(next);
      return;
    }
    let newOrder = shuffle([0, 1]);
    if (newOrder[0] === justPlayed) {
      newOrder = [newOrder[1], newOrder[0]];
    }
    setOrder(newOrder);
    setIndex(0);
  }

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      poster={current.poster}
      autoPlay
      muted
      playsInline
      onEnded={handleEnded}
    >
      <source src={current.src} type="video/mp4" />
    </video>
  );
}

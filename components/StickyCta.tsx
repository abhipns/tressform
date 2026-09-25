"use client";

// Doc table's global "Sticky CTA" row — previously Missing/not built.
// A persistent "Try It Free" pill: hidden while the Hero (#hero) is on
// screen, appears once it scrolls out of view, and stays dismissed for the
// rest of the session once closed (sessionStorage, so it's back next visit).

import { useEffect, useState } from "react";

const DISMISS_KEY = "tressform:stickyCtaDismissed";

export default function StickyCta() {
  const [heroVisible, setHeroVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
    }

    const hero = document.getElementById("hero");
    if (!hero) return;

    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  if (heroVisible || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-5 pr-2.5 shadow-card">
        <a href="#upload" className="btn-primary rounded-full !py-2 !px-4 text-[14px]">
          Try It Free
        </a>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:text-ink-heading"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

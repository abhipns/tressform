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

    // 10.10.2026: the pill also steps aside while the upload section is on
    // screen. It used to float over that section's own button — on a phone
    // it sat right on top of "See my preview" — and there is no point
    // inviting someone to "try it" while they are in the middle of trying it.
    const targets = ["hero", "upload"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const onScreen = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target);
          else onScreen.delete(entry.target);
        }
        setHeroVisible(onScreen.size > 0);
      },
      { threshold: 0 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (heroVisible || dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border border-line bg-surface py-2 pl-5 pr-2.5 shadow-card">
        <a href="#upload" className="btn-primary rounded-full !py-2 !px-4 text-[14px]">
          Try it free
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

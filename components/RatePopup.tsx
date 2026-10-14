"use client";

// One-time "How did you like the hairstyles?" popup (14.10.2026, owner's
// request). StylePicks.tsx opens it about 3 seconds after a paid
// hairstyle's full set of pictures (front, sides, back) is ready — the
// moment the customer has just seen the result.
//
// Shown at most once per customer on this device: never again once they've
// seen it, whether they rate or press "Maybe later", and never if they have
// already rated the hairstyles. The same question stays on the hairstyle
// screen as a highlighted box, so anyone who skipped can still rate.

import { useEffect, useRef } from "react";
import RateBox, { myRatings } from "@/components/RateBox";

const SEEN_KEY = "tf_rate_popup_seen";

/** Whether this customer may still be asked (not shown before, not rated yet). */
export async function mayAskForRating(): Promise<boolean> {
  try {
    if (window.localStorage.getItem(SEEN_KEY)) return false;
  } catch {
    /* storage blocked: fall through to the rating check */
  }
  const mine = await myRatings();
  return !mine.hairstyles;
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* not remembered on this device */
  }
}

export default function RatePopup({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markSeen();
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      // Above the sticky header (z-[100]) and the floating "See my hairstyles" pill (z-[90]).
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Rate your hairstyles"
        tabIndex={-1}
        className="w-full max-w-[460px] rounded-[20px] bg-surface p-5 shadow-card outline-none sm:p-6"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[.04em] text-mint-deep">Your hairstyles are ready</p>
            <p className="mt-1 text-[14px] text-ink-muted">A quick rating helps other people decide. It takes a few seconds.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full px-2 text-[24px] leading-none text-ink-muted hover:text-ink-heading"
          >
            ×
          </button>
        </div>
        <RateBox section="hairstyles" bare onSent={() => window.setTimeout(onClose, 1800)} />
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-[14px] font-semibold text-ink-muted underline decoration-line underline-offset-4"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

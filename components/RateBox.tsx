"use client";

// The rating box (13.10.2026): five stars, then an optional comment and
// the name to show. Used under the hairstyle list ("list") and once the
// four views of a paid hairstyle are ready ("hairstyles"). If the customer
// already rated this part, it says so, with a link to change it.
//
// 14.10.2026: customers weren't finding the boxes at the very bottom of the
// hairstyle screen. They now sit higher up (StylePicks.tsx) and are
// highlighted, and the hairstyles question also opens as a one-time popup
// once a paid hairstyle's pictures are ready (components/RatePopup.tsx).
// `bare` drops the outer box for use inside that popup; `onSent` lets the
// popup close itself after a rating is sent.

import { useEffect, useState } from "react";
import { SUPABASE_MOCK_MODE, authHeaders, getMockUserId } from "@/lib/authClient";
import { COMMENT_MAX, NAME_MAX, REVIEW_SECTIONS, type ReviewSection } from "@/lib/reviews";

type Mine = { rating: number; comment: string | null };

const cache: { promise: Promise<Partial<Record<ReviewSection, Mine>>> | null } = { promise: null };

/** The customer's own ratings (shared with the popup, which only opens if this part isn't rated yet). */
export function myRatings(): Promise<Partial<Record<ReviewSection, Mine>>> {
  cache.promise ??= loadMine().catch(() => ({}));
  return cache.promise;
}

async function loadMine(): Promise<Partial<Record<ReviewSection, Mine>>> {
  const res = await fetch("/api/reviews/mine", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(SUPABASE_MOCK_MODE ? { userId: getMockUserId() } : {}),
  });
  if (!res.ok) return {};
  const data = await res.json().catch(() => ({}));
  const out: Partial<Record<ReviewSection, Mine>> = {};
  for (const r of Array.isArray(data.reviews) ? data.reviews : []) out[r.section as ReviewSection] = { rating: r.rating, comment: r.comment };
  return out;
}

function Stars({ value, onPick, size = 34 }: { value: number; onPick?: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role={onPick ? "radiogroup" : undefined} aria-label={onPick ? "Your rating" : `${value} out of 5 stars`} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) =>
        onPick ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => onPick(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="rounded-md leading-none transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint-deep"
            style={{ fontSize: size }}
          >
            <span className={n <= shown ? "text-lilac" : "text-line"}>★</span>
          </button>
        ) : (
          <span key={n} aria-hidden="true" className={n <= value ? "text-lilac" : "text-line"} style={{ fontSize: size }}>
            ★
          </span>
        )
      )}
    </div>
  );
}

export { Stars };

export default function RateBox({
  section,
  bare = false,
  onSent,
}: {
  section: ReviewSection;
  bare?: boolean;
  onSent?: () => void;
}) {
  const [mine, setMine] = useState<Mine | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);
  const q = REVIEW_SECTIONS[section];

  useEffect(() => {
    let alive = true;
    myRatings().then((all) => alive && setMine(all[section] ?? null));
    return () => {
      alive = false;
    };
  }, [section]);

  async function send() {
    if (!rating) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          section,
          rating,
          comment,
          displayName: name,
          ...(SUPABASE_MOCK_MODE ? { userId: getMockUserId() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "That didn't send. Please try again.");
        return;
      }
      cache.promise = null;
      setMine({ rating, comment: comment || null });
      setEditing(false);
      setThanks(true);
      onSent?.();
    } finally {
      setBusy(false);
    }
  }

  if (mine === undefined) return null;

  if (mine && !editing) {
    return (
      <div
        className={`${bare ? "" : "mt-6 rounded-[16px] bg-bg-soft px-4 py-3"} flex flex-wrap items-center gap-x-3 gap-y-1 text-[14.5px]`}
      >
        <span className="font-semibold text-ink-heading">{thanks ? "Thank you for your rating!" : "You rated this"}</span>
        <Stars value={mine.rating} size={18} />
        <button
          type="button"
          className="font-semibold text-mint-deep underline decoration-mint/40 underline-offset-4"
          onClick={() => {
            setRating(mine.rating);
            setComment(mine.comment ?? "");
            setEditing(true);
            setThanks(false);
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className={bare ? "" : "mt-6 rounded-[18px] border-2 border-mint bg-mint-pale/40 p-4 sm:p-5"}>
      {!bare && <p className="text-[13px] font-bold uppercase tracking-[.04em] text-mint-deep">Rate your experience</p>}
      <p className={`${bare ? "" : "mt-1"} text-[16.5px] font-semibold text-ink-heading`}>{q.question}</p>
      <div className="mt-2">
        <Stars value={rating} onPick={setRating} />
      </div>
      {rating > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-[13.5px] font-semibold text-ink-heading">Tell others what you thought (optional)</span>
            <textarea
              value={comment}
              maxLength={COMMENT_MAX}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-sm2 border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-mint-deep"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13.5px] font-semibold text-ink-heading">Name to show with it (optional)</span>
            <input
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your first name"
              className="w-full rounded-sm2 border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-mint-deep sm:max-w-[280px]"
            />
          </label>
          <p className="text-[12.5px] leading-[1.45] text-ink-muted">
            Your stars count in the average on our home page straight away. Comments appear there once we&apos;ve checked them.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary !px-6 !py-2.5 !text-[15px]" disabled={busy} onClick={send}>
              {busy ? "Sending…" : "Send rating"}
            </button>
            {editing && (
              <button type="button" className="btn-secondary !px-5 !py-2.5 !text-[15px]" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
          {error && <p className="text-[14px] font-medium text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}

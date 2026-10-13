"use client";

// "What customers say" — the home page reviews (13.10.2026).
//
// Shows the average for each part (every rating counts, low ones too) and
// the newest comments the owner has approved on /admin/reviews. Until at
// least one review is approved the section doesn't show at all, so the page
// never has an empty "reviews" block.

import { useEffect, useState } from "react";
import { Stars } from "./RateBox";
import { REVIEW_SECTIONS, REVIEW_SECTION_IDS, type PublicReview, type ReviewSection, type ReviewSummary } from "@/lib/reviews";

export default function Reviews() {
  const [data, setData] = useState<{ summary: Record<ReviewSection, ReviewSummary>; reviews: PublicReview[] } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/reviews")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setData(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!data || data.reviews.length === 0) return null;

  return (
    <section id="reviews" className="bg-bg-soft">
      <div className="frame py-16 sm:py-20">
        <p className="eyebrow">Reviews</p>
        <h2 className="h-display">What customers say</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {REVIEW_SECTION_IDS.map((id) => {
            const s = data.summary[id];
            if (!s || !s.count || s.avg === null) return null;
            return (
              <div key={id} className="flex items-center gap-3 rounded-full bg-surface px-5 py-2.5 shadow-card">
                <span className="font-heading text-[22px] font-semibold text-ink-heading">{s.avg.toFixed(1)}</span>
                <Stars value={Math.round(s.avg)} size={17} />
                <span className="text-[14px] text-ink-muted">
                  {REVIEW_SECTIONS[id].label} · {s.count} rating{s.count === 1 ? "" : "s"}
                </span>
              </div>
            );
          })}
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.reviews.map((r) => (
            <li key={r.id} className="flex flex-col rounded-[20px] bg-surface p-5 shadow-card">
              <Stars value={r.rating} size={18} />
              {r.comment && <p className="mt-3 flex-1 whitespace-pre-line text-[15.5px] leading-[1.55]">&ldquo;{r.comment}&rdquo;</p>}
              <p className="mt-4 text-[13.5px] text-ink-muted">
                <span className="font-semibold text-ink-heading">{r.name}</span> · {REVIEW_SECTIONS[r.section].label} ·{" "}
                {new Date(r.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

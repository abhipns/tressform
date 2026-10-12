"use client";

// "Every preview, from four sides" — the collage in What you get.
//
// 12.10.2026: real Studio pictures the owner made while testing the side
// and back views (an AI-made man with short hair, a woman with long waves
// and a man with curls; no customers). One person at a time, chosen with
// the tabs; four across on a computer, two by two on a phone.

import { useState } from "react";
import Image from "next/image";

const PEOPLE = [
  { id: "man-curly", tab: "Curls" },
  { id: "woman-long", tab: "Long waves" },
  // Its back view shows a thin-looking crown (made before that was fixed): last, until remade.
  { id: "man-short", tab: "Short and tapered" },
];
const VIEWS = [
  { id: "front", label: "Front" },
  { id: "left", label: "Left side" },
  { id: "right", label: "Right side" },
  { id: "back", label: "Back" },
];

export default function FourViews() {
  const [active, setActive] = useState(PEOPLE[0].id);
  const person = PEOPLE.find((p) => p.id === active) ?? PEOPLE[0];
  return (
    <div className="mt-14">
      <h3 className="text-[clamp(22px,2.2vw,28px)] font-semibold leading-tight">Every preview, from four sides.</h3>
      <p className="mt-2 max-w-[56ch] text-[15.5px] leading-[1.6]">
        The front, both sides and the back of each style you choose, so you and your barber can see the whole cut. The
        sides and back are the AI&apos;s estimate from your one selfie.
      </p>
      <div role="tablist" aria-label="Example" className="mt-5 flex flex-wrap gap-2">
        {PEOPLE.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === active}
            onClick={() => setActive(p.id)}
            className={`rounded-full border px-4 py-2 text-[14.5px] font-semibold transition ${
              p.id === active ? "border-mint bg-mint text-white" : "border-line bg-surface text-ink-heading hover:border-ink-heading"
            }`}
          >
            {p.tab}
          </button>
        ))}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {VIEWS.map((v) => (
          <li key={v.id}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-[16px] bg-line">
              <Image
                src={`/four-views/${person.id}-${v.id}-v4.jpg`}
                alt={`${person.tab} haircut, ${v.label.toLowerCase()}`}
                width={480}
                height={640}
                className="h-full w-full object-cover"
              />
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-ink-heading">
                {v.label}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13.5px] text-ink-muted">Examples made with Tressform on AI-made people, not customers.</p>
    </div>
  );
}

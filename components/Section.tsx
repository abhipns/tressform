// The two building blocks of the home page (10.10.2026 design pass).
//
// Band  — a full-width strip of the page in one of four backgrounds. The
//         page alternates them on purpose, so a visitor can feel where one
//         subject ends and the next begins:
//           cream  the page's own colour — explaining
//           paper  lighter — reassurance (what to expect, privacy)
//           mint   the product itself — the upload tool
//           dark   the deep green of the header — the opening, the problem,
//                  the closing call
// Rail  — heading and intro on the left, content on the right. On desktop
//         the heading stays in view while the content scrolls past it. On
//         phones the two simply stack.
//
// Before this, every section was a centred small-caps label, a centred
// heading and a row of white boxes, 19 times over.

import type { ReactNode } from "react";

const TONES = {
  cream: "bg-bg text-ink-body",
  paper: "bg-bg-soft text-ink-body",
  mint: "bg-mint-pale text-ink-body",
  dark: "bg-[#16261C] text-white/75",
} as const;

export type Tone = keyof typeof TONES;

export function Band({
  id,
  tone = "cream",
  className = "",
  children,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`${TONES[tone]} ${className}`}>
      <div className="frame py-16 sm:py-20 lg:py-28">{children}</div>
    </section>
  );
}

export function Rail({
  heading,
  lead,
  aside,
  dark = false,
  children,
}: {
  heading: ReactNode;
  lead?: ReactNode;
  /** Anything else that belongs under the intro: tips, a link, a note. */
  aside?: ReactNode;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-x-24">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <h2 className={`h-display ${dark ? "text-white" : ""}`}>{heading}</h2>
        {lead && <p className="lead mt-5 max-w-[44ch]">{lead}</p>}
        {aside}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

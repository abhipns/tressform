// What you get — the two things a customer leaves with besides a picture.
//
// 10.10.2026 design pass: merges the old "Your personal hair profile &
// guided haircut" section (HairProfile.tsx) and the three-box "More than a
// preview" section into one. The hair profile and the barber card are drawn
// as two slips of paper, because that is what they are in the customer's
// hand, and the barber card is the same object the hero shows.
//
// Both slips are EXAMPLES and are labelled so. (Their contents are the same
// example values the old section showed.)

import { Band, Rail } from "./Section";

const PROFILE = [
  { label: "Face shape", value: "Oval" },
  { label: "Hair texture", value: "Wavy" },
  { label: "Hair density", value: "Medium" },
  { label: "Hairline", value: "Rounded" },
  { label: "Maintenance", value: "Low" },
];

const CARD = [
  { part: "Top", detail: "3–4 inches (7.5–10 cm), scissor-cut for texture" },
  { part: "Sides", detail: "Clipper taper, guard 1.5–2 fading to 0.5 around the ears" },
  { part: "Back", detail: "0.5 blend, sharp neckline" },
  { part: "Styling", detail: "Blow-dry, then matte pomade" },
];

const INCLUDED = [
  { title: "Hairstyles matched to you", body: "Recommendations based on your own face shape, not a list of what is trending." },
  { title: "Four-side preview", body: "Front, left, right and back views of the hairstyle you pick." },
  { title: "Barber-ready instructions", body: "Exact lengths, cutting technique and styling guidance, so your barber can recreate the look." },
];

function Slip({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-[16px] bg-surface p-6 shadow-[0_24px_50px_-24px_rgba(31,51,36,0.45)] ring-1 ring-black/5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-3">
        <h3 className="text-[20px] font-semibold leading-none">{title}</h3>
        <span className="text-[13.5px] text-ink-muted">Example</span>
      </div>
      {children}
    </div>
  );
}

export default function WhatYouGet() {
  return (
    <Band id="what" tone="cream">
      <Rail
        heading="You leave with more than a picture."
        lead="A preview shows you the look. Your hair profile and the barber card are what get you the same cut in the chair."
        aside={
          <a href="#pricing" className="btn-secondary mt-8">
            See the packs
          </a>
        }
      >
        <div className="grid items-start gap-6 sm:grid-cols-2 sm:gap-5 lg:gap-7">
          <Slip title="Hair profile" className="sm:-rotate-[1.5deg]">
            <dl className="mt-1">
              {PROFILE.map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-4 border-b border-line/70 py-3 last:border-b-0">
                  <dt className="text-[15px] text-ink-muted">{f.label}</dt>
                  <dd className="font-heading text-[18px] font-semibold text-ink-heading">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Slip>

          <Slip title="Barber card" className="sm:mt-12 sm:rotate-[1.5deg]">
            <dl className="mt-1">
              {CARD.map((row) => (
                <div key={row.part} className="grid grid-cols-[72px_1fr] items-baseline gap-3 border-b border-line/70 py-3 last:border-b-0">
                  <dt className="text-[15px] text-ink-muted">{row.part}</dt>
                  <dd className="text-[15.5px] leading-[1.5] text-ink-heading">{row.detail}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[13.5px] leading-[1.5] text-ink-muted">
              Trim every 3 weeks. Works best on straight to wavy hair.
            </p>
          </Slip>
        </div>

        <dl className="mt-14 border-t border-line">
          {INCLUDED.map((item) => (
            <div key={item.title} className="grid gap-x-8 gap-y-1 border-b border-line py-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <dt className="font-heading text-[19px] font-semibold text-ink-heading">{item.title}</dt>
              <dd className="text-[15.5px] leading-[1.6]">{item.body}</dd>
            </div>
          ))}
        </dl>
      </Rail>
    </Band>
  );
}

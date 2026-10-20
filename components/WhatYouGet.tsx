// What you get — the two things a customer leaves with besides a picture.
//
// 10.10.2026 design pass: merges the old "Your personal hair profile &
// guided haircut" section (HairProfile.tsx) and the three-box "More than a
// preview" section into one. The two are drawn as slips of paper, because
// that is what they are in the customer's hand.
//
// 11.10.2026: both slips now show what the result screen really gives
// (components/StylePicks.tsx). The first used to list hair density and
// hairline, which are not read; the second showed clipper guard numbers and
// styling products, which are not given; and the list underneath promised
// front, left, right and back views when a preview is the front view only.
// The barber wording is the real wording for that style, taken from the
// same list the result screen uses.
//
// Both slips are EXAMPLES and are labelled so.

import { Band, Rail } from "./Section";
import { barberName, barberPoints, hairstyleById } from "@/lib/content/hairstyles";
import FourViews from "./FourViews";
import BarberPointText from "./BarberPointText";

const PROFILE = [
  { label: "Face shape", value: "Round" },
  { label: "Hair type", value: "Wavy" },
  { label: "Hair now", value: "Medium" },
  { label: "Best match", value: "Textured quiff" },
  { label: "Upkeep", value: "Some" },
];

const EXAMPLE_STYLE = hairstyleById("m-textured-quiff");

const INCLUDED = [
  {
    title: "Hairstyles matched to you",
    body: "Chosen for your face shape, your hair type and the length you have now, not from a list of what is trending.",
  },
  { title: "Each hairstyle on your own photo", body: "Your best-matched hairstyles are shown on your own photo, not on a model. Tap one to see it from both sides and the back." },
  {
    title: "Barber-ready instructions",
    body: "The cut written out in a barber's words, with lengths, so your barber can recreate the look.",
  },
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
        lead="An AI hairstyle shows you the look. Your hair profile and the words for your barber are what get you the same cut in the chair."
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

          <Slip title="For your barber" className="sm:mt-12 sm:rotate-[1.5deg]">
            <p className="mt-4 font-heading text-[17px] font-semibold leading-snug text-ink-heading">
              {EXAMPLE_STYLE?.name}
            </p>
            {EXAMPLE_STYLE && (
              <>
                <p className="mt-2 text-[15px] text-ink-heading">Ask for {barberName(EXAMPLE_STYLE)}:</p>
                <ul className="mt-2 flex flex-col gap-1.5 text-[15px] leading-[1.45] text-ink-heading">
                  {barberPoints(EXAMPLE_STYLE).map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <span className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full bg-mint" aria-hidden="true" />
                      <BarberPointText point={point} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-3 text-[13.5px] leading-[1.5] text-ink-muted">
              Every style on your list comes with its own.
            </p>
          </Slip>
        </div>

        <FourViews />

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

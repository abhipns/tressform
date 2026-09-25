// NOTE: no longer rendered on the homepage — this section's content (STEPS
// pills + Barber Instruction Card) was merged into HairProfile.tsx, side by
// side with the Hair Profile card, per feedback that the two sections looked
// identical/equal and should sit together. Keeping this file for reference;
// see app/page.tsx and HairProfile.tsx for the current merged section.
//
// Doc table row 11, "Guided Haircut" — elevated per the comment on this row
// to a major value proposition (its own section, not a minor feature),
// renamed "Show Your Barber Exactly What You Want". The barber-instruction
// card below follows the India-specific standard from that comment (Part L)
// — this is now the sitewide standard for every instruction block:
//   - always both inches and cm
//   - name the technique explicitly (never assume clippers-only — scissor
//     cutting is common practice among Indian barbers)
//   - a hair-type suitability note (straight/wavy/curly/coily)
//   - named product types, not vague terms — placeholder brand names only,
//     since naming a real brand without a partnership implies an
//     endorsement Tressform hasn't secured
//   - maintenance frequency stated in weeks
// Reuses the same card style the results page uses for its own
// barber-instruction card, since this section previews that paid product.

const STEPS = ["Reference Photo", "Tressform Version", "4-Side Visualization", "Haircut Instructions", "Your Barber"];

const INSTRUCTION = [
  { part: "TOP", detail: "3–4 inches (7.5–10cm), scissor-cut for texture" },
  { part: "SIDES", detail: "Clipper taper, guard #1.5–2 fading to #0.5 around the ears" },
  { part: "BACK", detail: "#0.5 blend, sharp neckline" },
  { part: "STYLING", detail: "Blow-dry, apply matte pomade" },
];

export default function GuidedHaircut() {
  return (
    <section className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">Guided Haircut</p>
        <h2>Show Your Barber Exactly What You Want</h2>
        <p>
          Not just a picture — a precise, barber-ready instruction card your stylist can follow to the letter.
        </p>
      </div>

      <div className="mx-auto mb-9 flex max-w-[760px] flex-wrap items-center justify-center gap-2.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2.5">
            <span className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-heading">
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="text-ink-muted">&rarr;</span>}
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-[420px] rounded-lg2 border border-line bg-surface p-6 text-left shadow-card">
        <p className="mb-4 border-b border-line pb-3 text-[13px] font-semibold uppercase tracking-[.04em] text-ink-muted">
          Barber Instruction Card
        </p>
        <dl className="flex flex-col gap-3">
          {INSTRUCTION.map((row) => (
            <div key={row.part} className="flex flex-col gap-0.5">
              <dt className="text-[11.5px] font-bold tracking-[.03em] text-mint-deep">{row.part}</dt>
              <dd className="text-[13.5px] leading-[1.5] text-ink-body">{row.detail}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink-muted">
          Trim every 3 weeks &bull; Works best on straight-to-wavy hair
        </p>
      </div>

      <a href="#upload" className="btn-primary mt-8 inline-flex">
        Get My Guided Haircut
      </a>
    </section>
  );
}

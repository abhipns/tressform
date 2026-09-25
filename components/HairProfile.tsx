// Doc table rows 10 ("Your Personal Hair Profile") and 11 ("Guided Haircut")
// — merged per feedback into a single section with two equal-size,
// side-by-side cards, since the two cards read as visually identical/equal
// weight and belonged together rather than as two separate full-width
// sections. GuidedHaircut.tsx's own <section> is no longer rendered on the
// homepage (see app/page.tsx) — its STEPS pill row and Barber Instruction
// Card content now live here, next to the Hair Profile card.

const PROFILE_FIELDS = [
  { label: "Face Shape", value: "Oval" },
  { label: "Hair Texture", value: "Wavy" },
  { label: "Hair Density", value: "Medium" },
  { label: "Hairline", value: "Rounded" },
  { label: "Maintenance", value: "Low" },
];

// 24.09.2026: "Your Barber" removed per feedback — this section is about
// analysing the customer and producing their haircut instructions; the
// barber/salon step belongs later in the journey, not in this steps row.
const STEPS = ["Reference Photo", "Tressform Version", "4-Side Visualization", "Haircut Instructions"];

const INSTRUCTION = [
  { part: "TOP", detail: "3–4 inches (7.5–10cm), scissor-cut for texture" },
  { part: "SIDES", detail: "Clipper taper, guard #1.5–2 fading to #0.5 around the ears" },
  { part: "BACK", detail: "#0.5 blend, sharp neckline" },
  { part: "STYLING", detail: "Blow-dry, apply matte pomade" },
];

export default function HairProfile() {
  return (
    <section className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">Your Personal Hair Profile &amp; Guided Haircut</p>
        <h2>We analyse before we ever recommend a style</h2>
        <p>
          Three selfies is all it takes — Tressform builds a profile of your face and hair, then turns your chosen
          style into a precise, barber-ready instruction card.
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

      <div className="mx-auto grid max-w-[840px] gap-5 text-left md:grid-cols-2">
        <div className="flex h-full flex-col rounded-lg2 border border-line bg-surface p-6 shadow-card">
          <p className="mb-4 border-b border-line pb-3 text-[13px] font-semibold uppercase tracking-[.04em] text-ink-muted">
            Your Personal Hair Profile
          </p>
          <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint-pale text-mint-deep">
              ✓
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink-heading">Profile complete</p>
              <p className="text-[12px] text-ink-muted">Based on your 3 selfies</p>
            </div>
          </div>
          <dl className="flex flex-1 flex-col gap-2.5">
            {PROFILE_FIELDS.map((f) => (
              <div key={f.label} className="flex items-center justify-between text-[13.5px]">
                <dt className="text-ink-muted">{f.label}</dt>
                <dd className="rounded-full bg-bg-soft px-3 py-1 font-semibold text-ink-heading">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex h-full flex-col rounded-lg2 border border-line bg-surface p-6 shadow-card">
          <p className="mb-4 border-b border-line pb-3 text-[13px] font-semibold uppercase tracking-[.04em] text-ink-muted">
            Barber Instruction Card
          </p>
          <dl className="flex flex-1 flex-col gap-3">
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
      </div>

      <a href="#upload" className="btn-primary mt-8 inline-flex">
        Get My Guided Haircut
      </a>
    </section>
  );
}

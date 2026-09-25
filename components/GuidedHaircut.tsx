// Part B (revised sequence) — section 9, "Guided Haircut". New standalone,
// highly visual section per the doc: Reference Photo → Tressform Version →
// 4-Side Visualization → Haircut Instructions → Your Barber. Placeholder
// step strip until real generated-preview assets exist; wire this up to a
// real unlocked result once the results page (Part E) is built.

const STEPS = ["Reference Photo", "Tressform Version", "4-Side Visualization", "Haircut Instructions", "Your Barber"];

export default function GuidedHaircut() {
  return (
    <section className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">Guided Haircut</p>
        <h2>From preview to the chair, step by step</h2>
      </div>
      <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-center gap-2.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2.5">
            <span className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-heading">
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="text-ink-muted">&rarr;</span>}
          </div>
        ))}
      </div>
      <a href="#upload" className="btn-primary mt-8 inline-flex">
        Get My Guided Haircut
      </a>
    </section>
  );
}

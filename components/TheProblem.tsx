// Part B (revised sequence) — section 4, "The Problem". Deliberately no CTA:
// per the doc, this section should sit and let the problem register before
// the sell starts. Placeholder infographic — swap the four badges below for
// a real illustration/infographic pass when design assets exist.

const FACTORS = ["Face shape", "Hair texture", "Density", "Hairline & proportions"];

export default function TheProblem() {
  return (
    <section id="problem" className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">The Problem</p>
        <h2>Most haircut advice ignores what actually matters</h2>
        <p>
          A great cut isn&apos;t one-size-fits-all — it depends on a handful of things most people never think to
          check before they sit in the chair.
        </p>
      </div>
      <div className="mx-auto flex max-w-[640px] flex-wrap items-center justify-center gap-3">
        {FACTORS.map((f) => (
          <span
            key={f}
            className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-heading"
          >
            {f}
          </span>
        ))}
      </div>
    </section>
  );
}

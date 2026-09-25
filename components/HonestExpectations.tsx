// Part J / doc table row 16 — "What Tressform Can — and Can't — Predict" in
// the table, but per the comment on this row: keep the section's name as
// "Honest Expectations" (don't rename it), keep the content in bullet
// points, and add reference images. Pairs "what the preview shows" vs "what
// real hair does," per the table's core content, reusing the same framing
// as the matching FAQ answer for consistency.

const PAIRS = [
  {
    shows: "The exact haircut shape, length, and silhouette on your face",
    reality: "Real hair has its own texture and growth pattern, so the finished look softens slightly in person",
  },
  {
    shows: "How the style sits from multiple angles",
    reality: "Your barber's hand and technique add small, natural differences the preview can't capture",
  },
  {
    shows: "A confident, realistic guide to help you and your barber agree on direction",
    reality: "It's a very close sneak peek, not a lab-exact guarantee of the final result",
  },
];

export default function HonestExpectations() {
  return (
    <section id="expectations" className="wrap py-16">
      <div className="mx-auto max-w-[820px]">
        <div className="section-head">
          <p className="eyebrow">Honest Expectations</p>
          <h2>A close, realistic preview — not a promise</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-lg2 bg-bg-soft p-5">
            <div className="mb-4 aspect-[4/3] rounded-md2 bg-gradient-to-br from-mint-pale to-white" />
            <p className="mb-2.5 text-[12px] font-bold uppercase tracking-[.03em] text-mint-deep">What the preview shows</p>
            <ul className="flex flex-col gap-2">
              {PAIRS.map((p) => (
                <li key={p.shows} className="flex items-start gap-2 text-[13.5px] leading-[1.5] text-ink-body">
                  <span className="mt-[3px] text-mint-deep">✓</span>
                  {p.shows}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg2 bg-bg-soft p-5">
            <div className="mb-4 aspect-[4/3] rounded-md2 bg-gradient-to-br from-lilac/40 to-white" />
            <p className="mb-2.5 text-[12px] font-bold uppercase tracking-[.03em] text-ink-muted">What real hair does</p>
            <ul className="flex flex-col gap-2">
              {PAIRS.map((p) => (
                <li key={p.reality} className="flex items-start gap-2 text-[13.5px] leading-[1.5] text-ink-body">
                  <span className="mt-[3px] text-ink-muted">•</span>
                  {p.reality}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-muted">
          Think of your preview as a very confident sneak peek, not a guarantee.
        </p>
      </div>
    </section>
  );
}

// Doc table row 3, "The Possible Reasons" — previously Missing/not built.
// Built per the comment on that row: the 7 factors, plus a simple line-art
// infographic of 3–4 face-shape silhouettes (oval/square/round/heart) that
// doubles as a small credibility/education moment, not just decoration.
// No CTA, per the table.

const FACTORS = [
  "Face Shape",
  "Hair Texture",
  "Hair Density",
  "Hairline",
  "Proportions",
  "Maintenance",
  "Lack of Clear Haircut Instructions",
];

const FACE_SHAPES: { label: string; d: string }[] = [
  // Oval — tall, gently tapered
  { label: "Oval", d: "M50 8c16 0 26 16 26 34s-10 40-26 40-26-22-26-40S34 8 50 8Z" },
  // Square — strong jaw, wide
  { label: "Square", d: "M50 8c20 0 30 10 30 30v18c0 20-14 26-30 26s-30-6-30-26V38c0-20 10-30 30-30Z" },
  // Round — soft, equal width/height
  { label: "Round", d: "M50 10c22 0 32 16 32 34s-14 32-32 32-32-14-32-32S28 10 50 10Z" },
  // Heart — wide forehead, narrow chin
  { label: "Heart", d: "M50 10c18 0 30 10 30 26 0 22-16 36-30 46-14-10-30-24-30-46 0-16 12-26 30-26Z" },
];

export default function PossibleReasons() {
  return (
    <section id="reasons" className="wrap py-16">
      <div className="section-head">
        <p className="eyebrow">The Possible Reasons</p>
        <h2>Why the same haircut can look right on one person, wrong on another</h2>
      </div>

      <div className="mx-auto mb-10 flex max-w-[680px] flex-wrap items-center justify-center gap-3">
        {FACTORS.map((f) => (
          <span
            key={f}
            className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-heading"
          >
            {f}
          </span>
        ))}
      </div>

      <div className="mx-auto max-w-[760px] rounded-lg2 border border-line bg-surface p-8">
        <p className="mb-6 text-center text-[13.5px] text-ink-muted">
          Face shape alone changes what &ldquo;the same&rdquo; haircut looks like on you
        </p>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {FACE_SHAPES.map((shape) => (
            <div key={shape.label} className="flex flex-col items-center gap-2.5">
              <svg viewBox="0 0 100 100" fill="none" className="h-[72px] w-[72px]">
                <path d={shape.d} stroke="#3B2760" strokeWidth="3" strokeLinejoin="round" />
              </svg>
              <span className="text-[12.5px] font-semibold text-ink-heading">{shape.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Part B (revised sequence) — section 4, "The Problem" / doc table row 2.
// Warm opener + the 5 exact rhetorical questions supplied via comment on the
// Master Section Plan doc, each paired with a photo/illustration slot,
// alternating left/right per the table's "Image/asset needed" column.
// Placeholder image blocks — swap for real photos/illustrations when design
// assets exist. Deliberately no CTA, per the doc.

const QUESTIONS = [
  "Why does a hairstyle look great on them, but not on you?",
  "What hairstyle would you wear to your cousin's wedding?",
  "Ever had to compromise with your hairstyle because you couldn't explain exactly what you wanted?",
  "Ever shown a reference photo and still got a different haircut?",
  "Ever wished you could see a hairstyle on yourself before getting the haircut?",
];

export default function TheProblem() {
  return (
    <section id="problem" className="wrap py-16">
      <div className="section-head">
        <p className="eyebrow">The Problem</p>
        <h2>We&apos;ve all had these moments&hellip;</h2>
      </div>

      <div className="mx-auto flex max-w-[860px] flex-col gap-12">
        {QUESTIONS.map((q, i) => {
          const imageFirst = i % 2 === 0;
          return (
            <div
              key={q}
              className={`flex flex-col items-center gap-6 md:flex-row ${imageFirst ? "" : "md:flex-row-reverse"}`}
            >
              <div className="aspect-[4/3] w-full max-w-[320px] shrink-0 rounded-lg2 bg-gradient-to-br from-mint-pale to-white shadow-card" />
              <p className="text-center text-[19px] font-semibold leading-[1.4] text-ink-heading md:text-left">
                {q}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

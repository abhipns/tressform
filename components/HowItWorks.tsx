// Part B (revised sequence) — section 6, "How Tressform Works": the 4-step
// explainer (Analyse / Discover / Visualise / Guide) referenced by the
// header's "How It Works" nav link. No CTA on this section itself — it's
// explanatory, same as the old 3-step version it replaces.
//
// 24.09.2026: per user feedback, each card's copy is now 3 bullet points
// instead of one paragraph — easier to scan, and matches the level of
// detail the user wants per step.

const STEPS = [
  {
    title: "Analyse",
    points: [
      "Take three quick selfies — front, left, and right.",
      "Tressform analyses your face shape and key facial features.",
      "No special lighting or equipment is required.",
    ],
  },
  {
    title: "Discover",
    points: [
      "Explore a curated library of hairstyles matched to your profile.",
      "Discover styles that complement your face shape and features.",
      "Get personalised recommendations, not generic haircut suggestions.",
    ],
  },
  {
    title: "Visualise",
    points: [
      "See yourself in each matched hairstyle.",
      "Preview the look from multiple angles.",
      "Know how the style looks on you before you pick up the scissors.",
    ],
  },
  {
    title: "Guide",
    points: [
      "Get barber-ready instructions for your chosen hairstyle.",
      "See exact lengths, cutting techniques, and styling details.",
      "Save or share the instructions with your barber or salon.",
    ],
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="wrap py-7 pb-2">
      <div className="mx-auto mb-[26px] max-w-[560px] text-center">
        <p className="eyebrow mb-2">How It Works</p>
        <h3 className="text-[22px]">How Tressform Delivers Your Ideal Cut</h3>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="card">
            <div className="mb-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-mint-pale text-[14px] font-bold text-mint-deep">
              {i + 1}
            </div>
            <h4 className="mb-2 text-[16px]">{step.title}</h4>
            <ul className="flex flex-col gap-1.5 text-[14px] leading-[1.5] text-ink-body">
              {step.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-mint-deep" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

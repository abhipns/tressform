// Part B (revised sequence) — section 6, "How Tressform Works": the 4-step
// explainer (Analyse / Discover / Visualise / Guide) referenced by section 5
// ("Introduce Tressform")'s "See How It Works" CTA, and by the header's
// "How It Works" nav link. No CTA on this section itself — it's explanatory,
// same as the old 3-step version it replaces.

const STEPS = [
  {
    title: "Analyse",
    body: "Three quick selfies — front, left, and right. Tressform reads your face shape and features, no special lighting or equipment needed.",
  },
  {
    title: "Discover",
    body: "We match your analysis against a library of haircuts to find the styles that actually suit your face.",
  },
  {
    title: "Visualise",
    body: "See yourself in each matched haircut from every angle, before you ever pick up a pair of scissors.",
  },
  {
    title: "Guide",
    body: "Get barber-ready instructions — exact lengths, technique, and maintenance — to bring in or share with your salon.",
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
            <h4 className="mb-1.5 text-[16px]">{step.title}</h4>
            <p className="text-[14px] leading-[1.55] text-ink-body">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

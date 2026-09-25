// Doc table row 4, "Cost of Getting It Wrong" — previously Missing/not
// built. Copy is the exact list from the comment on that row, closing line
// verbatim, secondary text-link CTA per the table's CTA cell. Image is a
// 5-icon row (confidence/time/money/calendar/scissors), not photos —
// deliberately fast-paced after the heavier photo section above it.

const COSTS = [
  "3–6 weeks waiting for hair to grow back",
  "Money spent on a haircut you dislike",
  "Looking bad in photos",
  "Avoiding social events",
  "Having to wear caps/hats",
  "Trying to explain the problem to the barber",
  "Another haircut to correct it",
];

const ICONS = ["🙂", "⏱", "💸", "📅", "✂️"];

export default function CostOfGettingItWrong() {
  return (
    <section className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">The Cost</p>
        <h2>What does a wrong haircut actually cost you?</h2>
      </div>

      <div className="mx-auto mb-8 flex max-w-[420px] items-center justify-center gap-5">
        {ICONS.map((icon, i) => (
          <span key={i} className="text-[26px]" aria-hidden="true">
            {icon}
          </span>
        ))}
      </div>

      <ul className="mx-auto mb-7 flex max-w-[520px] flex-col gap-2.5 text-left">
        {COSTS.map((c) => (
          <li key={c} className="flex items-start gap-2.5 text-[14.5px] text-ink-body">
            <span className="mt-[3px] text-mint-deep">✕</span>
            {c}
          </li>
        ))}
      </ul>

      <p className="mx-auto max-w-[520px] text-[16px] font-semibold text-ink-heading">
        And the worst part? You have to live with the haircut until it grows out.
      </p>
    </section>
  );
}

// Doc table row 5, "Your Haircut Should Be Personal" — base for introducing
// Tressform, right before AI is explained. Copy is the suggested copy from
// the comment on this row, verbatim. No CTA specified.

const REASONS = [
  "Your face shape isn't their face shape.",
  "Your hair's texture and density are different.",
  "Your hairline shapes what works and what doesn't.",
];

export default function WhyPersonal() {
  return (
    <section className="wrap py-14 text-center">
      <div className="section-head">
        <p className="eyebrow">Why It's Personal</p>
        <h2>Your Haircut Should Be Personal</h2>
        <p>Before explaining AI, here&apos;s why generic haircut advice fails.</p>
      </div>
      <ul className="mx-auto flex max-w-[520px] flex-col gap-3 text-left">
        {REASONS.map((r) => (
          <li key={r} className="flex items-start gap-2.5 text-[15px] font-medium text-ink-heading">
            <span className="mt-[3px] text-mint-deep">✓</span>
            {r}
          </li>
        ))}
      </ul>
    </section>
  );
}

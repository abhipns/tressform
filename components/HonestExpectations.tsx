// Part J — "Honest expectations": sets an expectation gap between an AI
// preview and the real, in-chair result — ties to the footer disclaimer.

export default function HonestExpectations() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px] rounded-lg2 bg-bg-soft p-8 text-center md:p-12">
        <p className="eyebrow mb-3">Honest Expectations</p>
        <h2 className="mb-3 text-[clamp(22px,3vw,28px)]">A close, realistic preview — not a promise</h2>
        <p className="text-[14.5px] leading-[1.65] text-ink-body">
          Your preview is a close, realistic guide based on your photos — but real hair texture, growth pattern, and
          your barber&apos;s hand will always add small differences. Think of it as a very confident sneak peek, not a
          guarantee.
        </p>
      </div>
    </section>
  );
}

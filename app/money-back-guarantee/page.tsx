// /money-back-guarantee — built per the "Build all of them" decision on the
// placeholder nav-link pages (Footer's "Money-Back Guarantee" link,
// currently href="#"). Kept short and points to /refund for full terms,
// rather than duplicating that policy text in two places that could drift
// apart — matches how Footer.tsx already cross-references the two.

export default function MoneyBackGuaranteePage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[680px] text-center">
        <p className="eyebrow">Legal</p>
        <h1 className="mb-4 text-[clamp(26px,4vw,36px)]">Money-Back Guarantee</h1>
        <p className="mb-6 text-[15px] leading-[1.6] text-ink-body">
          You get a 100% refund if a technical glitch prevents the app from generating your images at all, even
          after multiple retries. Once your images successfully generate, there&apos;s no refund — including if you
          simply don&apos;t download them.
        </p>
        <p className="text-[14px] text-ink-muted">
          Our AI-generated previews are guidance to help you and your barber, not a guarantee of the final result —
          see{" "}
          <a href="/#expectations" className="font-semibold text-mint-deep">
            Honest Expectations
          </a>{" "}
          on the homepage. For the complete policy wording, see our{" "}
          <a href="/refund" className="font-semibold text-mint-deep">
            Refund Policy
          </a>
          .
        </p>
      </div>
    </section>
  );
}

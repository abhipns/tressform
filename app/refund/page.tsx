// /refund — built per the "Build all of them" decision on the placeholder
// nav-link pages (Footer's "Refund Policy" link, currently href="#"). This
// one's low-risk to state confidently: the policy text below is the exact
// rule already implemented and displayed elsewhere (Faq.tsx, Footer.tsx),
// resolved via doc thread c15edd31-2524 on 23.09.2026 — not new copy.

export default function RefundPolicyPage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px]">
        <p className="eyebrow">Legal</p>
        <h1 className="mb-6 text-[clamp(26px,4vw,36px)]">Refund Policy</h1>

        <div className="mb-6 rounded-lg2 border border-line bg-surface p-6">
          <h3 className="mb-2 text-[16px] text-mint-deep">100% refund</h3>
          <p className="text-[14.5px] leading-[1.6] text-ink-body">
            If a technical glitch prevents the app from generating your images at all, even after multiple retries,
            you get a full refund — no questions asked.
          </p>
        </div>

        <div className="mb-6 rounded-lg2 border border-line bg-surface p-6">
          <h3 className="mb-2 text-[16px] text-ink-heading">No refund</h3>
          <p className="text-[14.5px] leading-[1.6] text-ink-body">
            Once the app successfully generates your images, there is no refund — including if you simply don&apos;t
            download them, or decide you don&apos;t like the result. Previews are a close, realistic guide based on
            your photos, not a guarantee of your final in-chair result — see our{" "}
            <a href="/#expectations" className="font-semibold text-mint-deep">
              Honest Expectations
            </a>{" "}
            section on the homepage for what a preview can and can&apos;t predict.
          </p>
        </div>

        <p className="text-[13px] text-ink-muted">
          For the Money-Back Guarantee this policy backs, see our{" "}
          <a href="/money-back-guarantee" className="font-semibold text-mint-deep">
            Money-Back Guarantee
          </a>{" "}
          page.
        </p>

        <div className="mt-8 rounded-md2 border border-line bg-bg-soft p-4 text-[13px] leading-[1.6] text-ink-muted">
          This describes our actual refund rule as implemented in the product. As with the other legal pages, a
          lawyer hasn&apos;t formally reviewed the wording yet — treat this as accurate in substance, pending that
          review for final phrasing.
        </div>
      </div>
    </section>
  );
}

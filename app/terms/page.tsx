// /terms — built per the "Build all of them" decision on the placeholder
// nav-link pages (Footer's "Terms of Service" link, currently href="#").
//
// Same caveat as /privacy: not legal advice, drafted from real product
// decisions already made in this codebase (pricing, free-preview limits,
// Early Bird cutoff, referral credits, refund rule), not invented ones —
// but needs an actual lawyer's review before it's final.

const SECTIONS = [
  {
    heading: "The service",
    body: "Tressform generates AI hairstyle previews from photos you upload, plus barber-ready cutting instructions. Previews are a close, realistic guide based on your photos — not a guarantee of your final result, since real hair texture, growth pattern, and your barber's technique will always add small differences.",
  },
  {
    heading: "Free previews",
    body: "Every account gets 2 free previews, a lifetime allowance that doesn't refresh — including after you buy a paid pack. Full-resolution results and barber instructions require a paid plan.",
  },
  {
    heading: "Paid plans and pricing",
    body: "Starter Pack, Style Pack, and Full Explore are priced as shown on the Pricing section, GST-inclusive. Early Bird pricing is a genuine, time-bound launch discount available until 31 October 2026, 23:59 IST — purchases made before that date keep their price and photo count even after the discount ends; new purchases after that date are charged the regular price.",
  },
  {
    heading: "Refunds",
    body: "See our Refund Policy for full terms. In short: a 100% refund applies only if a technical glitch prevents image generation entirely, even after multiple retries. Once images successfully generate, no refund applies.",
  },
  {
    heading: "Refer & Earn",
    body: "Referral rewards are flat, non-withdrawable Tressform credits (not cash), earned once per referred customer on their first qualifying purchase, capped at ₹15,000 per referrer per financial year. Full mechanics are on the Refer & Earn page and in our FAQ.",
  },
  {
    heading: "Your content",
    body: "You retain ownership of the photos you upload. We use them only to generate your own results — see our Privacy Policy for how they're stored, secured, and deleted.",
  },
  {
    heading: "Changes to these terms",
    body: "We may update these terms as the product evolves. Material changes will be reflected here with an updated date once this page is finalized.",
  },
];

export default function TermsOfServicePage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px]">
        <p className="eyebrow">Legal</p>
        <h1 className="mb-2 text-[clamp(26px,4vw,36px)]">Terms of Service</h1>
        <div className="mb-8 rounded-md2 border border-line bg-bg-soft p-4 text-[13px] leading-[1.6] text-ink-muted">
          <strong className="text-ink-heading">Draft — pending legal review.</strong> These terms reflect how the
          product actually works today, but haven't been reviewed by a lawyer yet. Don't treat them as final,
          binding terms until that review is done.
        </div>

        <div className="flex flex-col gap-7">
          {SECTIONS.map((s) => (
            <div key={s.heading}>
              <h3 className="mb-2 text-[16px]">{s.heading}</h3>
              <p className="text-[14.5px] leading-[1.6] text-ink-body">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-9 text-[12.5px] text-ink-muted">Last updated: draft, not yet published.</p>
      </div>
    </section>
  );
}

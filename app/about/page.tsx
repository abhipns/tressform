// /about — built per the "Build all of them" decision on the placeholder
// nav-link pages (Footer's "About" link, currently href="#").
//
// Honesty boundary: Tressform is a pre-launch/early-stage product (Early
// Bird pricing, mock-mode integrations, no beta reviews yet per the user's
// "No Reviews as of now" call). This page does NOT invent a founding story,
// team headcount, office address, or funding claims — none of that has been
// established anywhere else in the codebase. It states the actual product
// mission (which IS established, throughout Hero/Trust/HonestExpectations)
// and is honest about being early-stage rather than presenting fabricated
// "About Us" company theater.

const VALUES = [
  {
    title: "Honest previews, not hype",
    body: "We'd rather show you a close, realistic guide and say so plainly than oversell an AI-perfect promise we can't back up. See our Honest Expectations section for exactly what a preview can and can't predict.",
  },
  {
    title: "Your photos stay yours",
    body: "Uploaded photos are never used to train our AI models and are auto-deleted 90 days after upload. Full details are in our Privacy Policy.",
  },
  {
    title: "Fair, simple pricing",
    body: "No subscriptions, no hidden fees. You pay once for a pack of previews, and refunds apply cleanly if the technology fails you — not if you simply change your mind after it works.",
  },
];

export default function AboutPage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px]">
        <p className="eyebrow">About</p>
        <h1 className="mb-4 text-[clamp(26px,4vw,36px)]">Why we built Tressform</h1>
        <p className="mb-8 text-[15px] leading-[1.6] text-ink-body">
          Too many haircuts start with a vague photo on a phone and a hopeful "something like this." Tressform gives
          you and your barber a realistic, personalized preview of a style on your actual face first — so the
          conversation in the chair starts from a shared picture, not a guess.
        </p>

        <div className="mb-10 rounded-md2 border border-line bg-bg-soft p-4 text-[13px] leading-[1.6] text-ink-muted">
          We're an early-stage product, currently in Early Bird launch pricing. We don't have a long company history
          or a big team to tell you about yet — just a focused product we're building carefully, one honest detail at
          a time.
        </div>

        <div className="flex flex-col gap-7">
          {VALUES.map((v) => (
            <div key={v.title}>
              <h3 className="mb-2 text-[16px]">{v.title}</h3>
              <p className="text-[14.5px] leading-[1.6] text-ink-body">{v.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-9 text-[14px] text-ink-muted">
          Questions or feedback? We'd genuinely like to hear it — see our{" "}
          <a href="/contact" className="font-semibold text-mint-deep">
            Contact
          </a>{" "}
          page.
        </p>
      </div>
    </section>
  );
}

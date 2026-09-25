// /careers — built per the "Build all of them" decision on the placeholder
// nav-link pages (Footer's "Careers" link, currently href="#").
//
// Honesty boundary: no real job openings, team size, or hiring plans exist
// anywhere in this codebase — Tressform is a solo/early-stage build (mock
// integrations everywhere, no team roster established). Rather than invent
// fake job listings, this is an honest "not actively hiring, but interested
// people can reach out" placeholder — same pattern as the empty beta-story
// state in GoogleRating.tsx.

export default function CareersPage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[640px] text-center">
        <p className="eyebrow">Careers</p>
        <h1 className="mb-4 text-[clamp(26px,4vw,36px)]">Not actively hiring right now</h1>
        <p className="mb-6 text-[15px] leading-[1.6] text-ink-body">
          Tressform is early-stage and we don't have open roles at the moment. If that changes, we'll list real
          openings here — no filler listings in the meantime.
        </p>
        <p className="text-[14px] text-ink-muted">
          Want to be first to know if that changes, or just want to say hi? Reach out via our{" "}
          <a href="/contact" className="font-semibold text-mint-deep">
            Contact
          </a>{" "}
          page.
        </p>
      </div>
    </section>
  );
}

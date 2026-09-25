// Part B (revised sequence) — section 15, "Tressform + Salons". Front-end
// marketing tease only — the "Find a Salon" flow depends on Part M's salon
// onboarding backend, which doesn't exist yet (still a phase-2 dependency
// per the doc's own flag). This section renders now so the homepage order
// and nav ("Salons") are correct end-to-end; wire the CTA to a real salon
// directory once Part M ships.

export default function TressformSalons() {
  return (
    <section id="salons" className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">Tressform + Salons</p>
        <h2>Take your preview straight to a matched salon</h2>
        <p>
          Once you&apos;ve got your barber instructions, find a partner salon nearby that&apos;s a good fit for the
          style you picked. Coming soon.
        </p>
      </div>
      <span className="btn-secondary pointer-events-none opacity-70" aria-disabled="true">
        Find a Salon — Coming Soon
      </span>
    </section>
  );
}

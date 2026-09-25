// Part B (revised sequence) — section 22, "Final CTA". Closing repeat of the
// hero's two CTAs, per the doc's table.

export default function FinalCta() {
  return (
    <section className="wrap py-16 text-center">
      <h2 className="mx-auto max-w-[640px] text-[clamp(24px,3.6vw,36px)]">Ready to see your perfect cut?</h2>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
        <a href="#upload" className="btn-primary">
          Find My Perfect Cut
        </a>
        <a href="#pricing" className="btn-secondary">
          Quick Checkout
        </a>
      </div>
    </section>
  );
}

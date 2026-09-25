// Part B (revised sequence) — section 3, Hero. CTAs: "Find My Perfect Cut"
// (start the analysis) and "Quick Checkout" (skip straight to plan
// selection). Reassurance line sits under the two CTAs.

export default function Hero() {
  return (
    <section className="wrap py-14 pb-10 text-center">
      <h1 className="mx-auto max-w-[820px] text-[clamp(30px,5vw,50px)] leading-[1.08]">
        Find Your Perfect Cut Before You Cut
      </h1>
      <p className="mx-auto mt-[18px] max-w-[560px] text-[16.5px] leading-[1.6] text-ink-body">
        Upload a few selfies and see exactly how new hairstyles will look on your real face — before you sit in the
        chair.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
        <a href="#upload" className="btn-primary">
          Find My Perfect Cut
        </a>
        <a href="#pricing" className="btn-secondary">
          Quick Checkout
        </a>
      </div>
      <p className="mt-4 text-[12.5px] font-medium text-ink-muted">
        Personalized hairstyles &bull; Barber-ready guidance &bull; No guesswork
      </p>
    </section>
  );
}

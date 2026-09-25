// Part B (revised sequence) — section 10, "Plan selection". A condensed
// teaser of the tiers (second purchase opportunity), distinct from the full
// pricing table later in the page (section 19, Pricing.tsx) — this one is
// deliberately light, just tier name + price, driving to Quick Checkout.

import { PACK_TIERS, paiseToRupees } from "@/lib/pricing";

export default function PlanSelection() {
  const tiers = Object.values(PACK_TIERS);

  return (
    <section className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">Choose Your Plan</p>
        <h2>Pick a pack, unlock your styles</h2>
      </div>
      <div className="mx-auto grid max-w-[760px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => (
          <div key={tier.tier} className="card">
            <h4 className="text-[15px]">{tier.label}</h4>
            <div className="mt-2 font-heading text-[22px] font-bold text-ink-heading">
              &#8377;{paiseToRupees(tier.pricePaise).split(".")[0]}
            </div>
          </div>
        ))}
      </div>
      <a href="#pricing" className="btn-primary mt-8 inline-flex">
        Quick Checkout
      </a>
    </section>
  );
}

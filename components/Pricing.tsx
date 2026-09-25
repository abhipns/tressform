// Part D — pricing tiers. Prices come straight from lib/pricing.ts (the same
// module the /api/payment/create-order route uses) so this section can never
// silently drift from what a customer is actually charged.

import { PACK_TIERS, MY_ASSETS_ADDON_PRICE_PAISE, paiseToRupees } from "@/lib/pricing";

const TIER_COPY: Record<
  keyof typeof PACK_TIERS,
  { tagline: string; popular?: boolean; features: string[] }
> = {
  STARTER: {
    tagline: "Try your first matches",
    features: ["Unlock 4 hairstyle results", "Full resolution images", "Full barber instructions"],
  },
  STYLE: {
    tagline: "Our most-picked plan",
    popular: true,
    features: ["Unlock 7 hairstyle results", "Full resolution images", "Full barber instructions"],
  },
  COMPLETE: {
    tagline: "Everything from this session",
    features: ["Unlock 10 hairstyle results", "Full resolution images", "Full barber instructions"],
  },
  FULL_EXPLORE: {
    tagline: "The complete look, styled",
    features: ["Hairstyle + beard + glasses + colour", "Backdrop & outfit available as My Assets add-ons", "Up to 15 generations (capped)"],
  },
};

export default function Pricing() {
  const tiers = Object.values(PACK_TIERS);

  return (
    <section id="pricing" className="wrap py-[70px]">
      <div className="section-head">
        <p className="eyebrow">Pricing</p>
        <h2>Pay only for the styles you love</h2>
        <p>All prices are GST-inclusive. Start free, then unlock full-resolution results and barber-ready instructions as you go.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative flex flex-col gap-3.5 rounded-md2 border-[1.5px] border-line bg-surface p-5">
          <h4 className="text-[16px]">Free</h4>
          <p className="min-h-8 text-[12.5px] text-ink-muted">Try it out, no commitment</p>
          <div className="font-heading text-[28px] font-bold text-ink-heading">₹0</div>
          <ul className="flex flex-1 flex-col gap-2.5 text-[12.5px] text-ink-body">
            <li>✓ Full face-shape analysis</li>
            <li>✓ Browse purpose &amp; style options</li>
            <li>✓ 2 low-res watermarked previews (lifetime, per account)</li>
          </ul>
          <a href="#upload" className="btn-secondary w-full">
            Start Free
          </a>
        </div>

        {tiers.map((tier) => {
          const copy = TIER_COPY[tier.tier];
          const isLocked = tier.tier === "FULL_EXPLORE";
          return (
            <div
              key={tier.tier}
              className={`relative flex flex-col gap-3.5 rounded-md2 border-[1.5px] bg-surface p-5 transition hover:-translate-y-1.5 hover:shadow-card ${
                copy.popular ? "border-mint" : "border-line"
              } ${isLocked ? "opacity-90 hover:translate-y-0 hover:shadow-none" : ""}`}
            >
              {copy.popular && (
                <span className="absolute -top-3 left-[18px] rounded-full bg-ink-heading px-3 py-1 text-[11px] font-bold tracking-[.03em] text-white">
                  Most Popular
                </span>
              )}
              {isLocked && (
                <span className="absolute -top-3 left-[18px] rounded-full bg-ink-muted px-3 py-1 text-[11px] font-bold tracking-[.03em] text-white">
                  Coming Soon
                </span>
              )}
              <h4 className="text-[16px]">{tier.label}</h4>
              <p className="min-h-8 text-[12.5px] text-ink-muted">{copy.tagline}</p>
              <div className="font-heading text-[28px] font-bold text-ink-heading">
                ₹{paiseToRupees(tier.pricePaise).split(".")[0]}
                <small className="text-[12px] font-medium text-ink-muted"> incl. GST</small>
              </div>
              <ul className="flex flex-1 flex-col gap-2.5 text-[12.5px] text-ink-body">
                {copy.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {isLocked ? (
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted">🔒 Not yet available</div>
              ) : (
                <a href="#upload" className={copy.popular ? "btn-primary w-full" : "btn-secondary w-full"}>
                  Choose {tier.label}
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-[13px] text-ink-muted">
        My Assets add-on (Background or Outfit swap): ₹{paiseToRupees(MY_ASSETS_ADDON_PRICE_PAISE).split(".")[0]}/photo,
        GST-inclusive.
      </p>
    </section>
  );
}

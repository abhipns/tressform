// Part D — pricing tiers. Prices come straight from lib/pricing.ts (the same
// module the /api/payment/create-order route should use) so this section can
// never silently drift from what a customer is actually charged.
//
// Rebuilt per the comment on the Master Section Plan doc's row 13 ("Unlock
// Your Top Matches + Pricing"):
//   - 3 paid tiers only (Starter / Style / Full Explore) — the old separate
//     "Complete Pack" is discarded as its own tier.
//   - Strikethrough regular price + Early Bird price on every card.
//   - "(GST incl.)" on every card — a compliance requirement, not just copy.
//   - Early Bird cutoff stated plainly per card: "Early Bird price — ends
//     31 Oct 2026."
//   - Free tier: previews convert to full resolution once any pack is
//     purchased, with a note marking them "Availed" once that's happened
//     (that conversion/marking is account-state, driven by real purchase
//     data — this static section shows the copy explaining it; the actual
//     per-user "Availed" badge belongs on the account/results page once
//     that's wired to real orders).
//
// 24.09.2026: Starter/Style CTAs now link to /checkout?tier=... (built per
// the doc's top checkout gap — "no checkout or results route exists
// anywhere in the app") instead of #upload, so a customer picking a plan
// pays immediately instead of being routed back into the free demo. Full
// Explore stays "🔒 Not yet available" and unlinked — checkout itself
// rejects that tier too (see api/payment/create-order/route.ts).

import { PACK_TIERS, MY_ASSETS_ADDON_PRICE_PAISE, EARLY_BIRD_CUTOFF_ISO, paiseToRupees } from "@/lib/pricing";

const TIER_COPY: Record<keyof typeof PACK_TIERS, { tagline: string; popular?: boolean; features: string[] }> = {
  STARTER: {
    tagline: "Try your first matches",
    features: ["Unlock 4 hairstyle results", "Full resolution images", "Full barber instructions"],
  },
  STYLE: {
    tagline: "Our most-picked plan",
    popular: true,
    features: ["Unlock 10 hairstyle results", "Full resolution images", "Full barber instructions"],
  },
  FULL_EXPLORE: {
    tagline: "The complete look, styled",
    features: [
      "Hairstyle + beard + glasses + hair colour",
      "Up to 15 generations (capped)",
      "Backdrop & outfit available as My Assets add-ons",
    ],
  },
};

const EARLY_BIRD_CUTOFF_LABEL = "31 Oct 2026";

export default function Pricing() {
  const tiers = Object.values(PACK_TIERS);

  return (
    <section id="pricing" className="wrap py-[70px]">
      <div className="section-head">
        <p className="eyebrow">Pricing</p>
        <h2>Pay only for the styles you love</h2>
        <p>
          All prices are GST-inclusive. Start free, then unlock full-resolution results and barber-ready
          instructions as you go.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:justify-items-stretch">
        <div className="relative flex min-w-0 flex-col gap-3.5 rounded-md2 border-[1.5px] border-line bg-surface p-5">
          <h4 className="text-[16px]">Free</h4>
          <p className="min-h-8 text-[12.5px] text-ink-muted">Try it out, no commitment</p>
          <div className="font-heading text-[28px] font-bold text-ink-heading">
            ₹0<small className="text-[12px] font-medium text-ink-muted"> (GST incl.)</small>
          </div>
          <ul className="flex flex-1 flex-col gap-2.5 text-[12.5px] text-ink-body">
            <li>✓ Full face-shape analysis</li>
            <li>✓ Browse purpose &amp; style options</li>
            <li>✓ 2 low-res watermarked previews (lifetime, per account)</li>
            <li>✓ Converted to full resolution the moment you buy any pack — marked &ldquo;Availed&rdquo; here once that happens</li>
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
              className={`relative flex min-w-0 flex-col gap-3.5 rounded-md2 border-[1.5px] bg-surface p-5 transition hover:-translate-y-1.5 hover:shadow-card ${
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

              <div className="flex items-baseline gap-2">
                {tier.regularPricePaise !== null && (
                  <span className="text-[16px] font-medium text-ink-muted line-through">
                    ₹{paiseToRupees(tier.regularPricePaise).split(".")[0]}
                  </span>
                )}
                <span className="font-heading text-[28px] font-bold text-ink-heading">
                  ₹{paiseToRupees(tier.earlyBirdPricePaise).split(".")[0]}
                </span>
                <small className="text-[12px] font-medium text-ink-muted">(GST incl.)</small>
              </div>
              <p className="text-[11.5px] font-semibold text-mint-deep">Early Bird price — ends {EARLY_BIRD_CUTOFF_LABEL}</p>

              <ul className="flex flex-1 flex-col gap-2.5 text-[12.5px] text-ink-body">
                {copy.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              {isLocked ? (
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted">🔒 Not yet available</div>
              ) : (
                <a
                  href={`/checkout?tier=${tier.tier}`}
                  className={copy.popular ? "btn-primary w-full" : "btn-secondary w-full"}
                >
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
      <p className="mx-auto mt-2 max-w-[560px] text-center text-[11.5px] text-ink-muted">
        Early Bird prices end {EARLY_BIRD_CUTOFF_LABEL} ({EARLY_BIRD_CUTOFF_ISO}); already-purchased packs keep their
        original entitlement even after the price changes.
      </p>
    </section>
  );
}

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
//     10.10.2026: shown only when GST_REGISTERED is true (lib/pricing.ts).
//     An unregistered business must not say its prices include GST.
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

//
// 10.10.2026 design pass: the four floating boxes became one rate card —
// the plans are columns of a single panel, the way a salon lists its
// prices, so they read as one comparison. The most-picked plan is the dark
// column. Nothing about the plans, prices or links changed, except:
//   - the Free plan's "Browse purpose & style options" line is gone (those
//     option buttons were removed from the upload step);
//   - its button says "See my hairstyles", the one name used for that action
//     everywhere on the site now.

import {
  PACK_TIERS,
  MY_ASSETS_ADDON_PRICE_PAISE,
  GST_REGISTERED,
  paiseToRupees,
} from "@/lib/pricing";

const TIER_COPY: Record<keyof typeof PACK_TIERS, { tagline: string; popular?: boolean; features: string[] }> = {
  STARTER: {
    tagline: "Try your first matches",
    features: ["4 hairstyle previews on your own photo", "You choose which styles to see", "Barber instructions with every preview"],
  },
  STYLE: {
    tagline: "Our most-picked plan",
    popular: true,
    features: ["10 hairstyle previews on your own photo", "You choose which styles to see", "Barber instructions with every preview"],
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

// 11.10.2026: these say what a free account really gets. The earlier lines
// promised low-resolution, watermarked previews that turn into
// full-resolution ones after a purchase; free previews have never been
// either, and nothing converts. Later the same night the free previews
// themselves were switched off (lib/pricing.ts FREE_PREVIEWS_ON): what is
// free is the reading and the list, and the third line says so.
const FREE_FEATURES = [
  "Your face shape and hair read from your photo",
  "Your own list of matched hairstyles",
  "Why each style suits you",
];

const EARLY_BIRD_CUTOFF_LABEL = "31 Dec 2026";

function Features({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <ul className={`flex flex-1 flex-col gap-3 text-[15px] leading-[1.45] ${dark ? "text-white/85" : "text-ink-body"}`}>
      {items.map((f) => (
        <li key={f} className="flex gap-2.5">
          <span className={`mt-[1px] font-semibold ${dark ? "text-lilac" : "text-mint"}`} aria-hidden="true">
            ✓
          </span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Pricing() {
  const tiers = Object.values(PACK_TIERS);

  return (
    <section id="pricing" className="bg-bg text-ink-body">
      <div className="frame py-16 sm:py-20 lg:py-28">
        <div className="grid items-end gap-x-16 gap-y-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-x-24">
          <h2 className="h-display">Pay only for the styles you love.</h2>
          <p className="lead max-w-[52ch]">
            {GST_REGISTERED ? "All prices are GST-inclusive. " : "The price you see is the price you pay. "}
            Your hairstyle list is free. A pack lets you see the styles on your own photo.
          </p>
        </div>

        {/* One panel; the 1px gaps between cells show the panel's line colour
            through, which draws the dividers at any number of columns. */}
        <div className="mt-10 grid gap-px overflow-hidden rounded-[28px] bg-line ring-1 ring-line sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          <div className="flex flex-col gap-5 bg-surface p-6 lg:p-8">
            <div>
              <h3 className="text-[22px] font-semibold">Free</h3>
              <p className="mt-1 text-[15px] text-ink-muted">Your hairstyle list, no commitment</p>
            </div>
            <p className="font-heading text-[44px] font-semibold leading-none text-ink-heading">₹0</p>
            <Features items={FREE_FEATURES} />
            <a href="#upload" className="btn-secondary w-full">
              See my hairstyles
            </a>
          </div>

          {tiers.map((tier) => {
            const copy = TIER_COPY[tier.tier];
            const isLocked = tier.tier === "FULL_EXPLORE";
            const dark = Boolean(copy.popular);
            return (
              <div
                key={tier.tier}
                className={`flex flex-col gap-5 p-6 lg:p-8 ${dark ? "bg-[#16261C] text-white" : "bg-surface"}`}
              >
                <div>
                  <h3 className={`text-[22px] font-semibold ${dark ? "text-white" : ""}`}>{tier.label}</h3>
                  <p className={`mt-1 text-[15px] ${dark ? "text-lilac" : "text-ink-muted"}`}>
                    {isLocked ? "Coming soon" : copy.tagline}
                  </p>
                </div>

                <div>
                  <p className="flex items-baseline gap-3">
                    <span className={`font-heading text-[44px] font-semibold leading-none ${dark ? "text-white" : "text-ink-heading"}`}>
                      ₹{paiseToRupees(tier.earlyBirdPricePaise).split(".")[0]}
                    </span>
                    {tier.regularPricePaise !== null && (
                      <span className={`text-[18px] line-through ${dark ? "text-white/50" : "text-ink-muted"}`}>
                        ₹{paiseToRupees(tier.regularPricePaise).split(".")[0]}
                      </span>
                    )}
                    {GST_REGISTERED && <span className="text-[13.5px] opacity-70">GST incl.</span>}
                  </p>
                  <p className={`mt-2 text-[14px] ${dark ? "text-white/70" : "text-ink-muted"}`}>
                    Early Bird price, ends {EARLY_BIRD_CUTOFF_LABEL}
                  </p>
                </div>

                <Features items={copy.features} dark={dark} />

                {isLocked ? (
                  <p className="py-3.5 text-center text-[15px] font-medium text-ink-muted">Not available yet</p>
                ) : dark ? (
                  <a href={`/checkout?tier=${tier.tier}`} className="btn-amber w-full !px-6 !py-3.5 !text-[16px]">
                    Choose {tier.label}
                  </a>
                ) : (
                  <a href={`/checkout?tier=${tier.tier}`} className="btn-secondary w-full">
                    Choose {tier.label}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 max-w-[80ch] text-[14.5px] leading-[1.6] text-ink-muted">
          <p>
            My Assets add-on (background or outfit swap): ₹{paiseToRupees(MY_ASSETS_ADDON_PRICE_PAISE).split(".")[0]} per
            photo{GST_REGISTERED ? ", GST-inclusive." : "."}
          </p>
          <p className="mt-1">
            Early Bird prices end {EARLY_BIRD_CUTOFF_LABEL}. Packs bought before then keep what they came with after
            the price changes.
          </p>
        </div>
      </div>
    </section>
  );
}

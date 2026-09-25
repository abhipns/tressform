// Part B (revised sequence) — section 16, "Maintain Your Look / Hair Care".
// New dedicated affiliate section, supersedes the old "Checkout products"
// bullet. Real product data comes from the affiliate_products table (Part J
// — manually curated via EarnKaro, no live feed) once that's populated and
// wired to an API route; this renders a static teaser in the meantime so the
// homepage order and nav ("Hair Care") are correct end-to-end.
//
// Affiliate disclosure required per Part J wherever real product links show.

export default function HairCare() {
  return (
    <section id="haircare" className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">Maintain Your Look</p>
        <h2>Hair Care &amp; Style, curated for you</h2>
        <p>
          A short list of wash, trim, and styling products matched to your haircut — picked by us, not a live feed.
          Product links are affiliate links; we may earn a commission at no extra cost to you.
        </p>
      </div>
      <span className="btn-secondary pointer-events-none opacity-70" aria-disabled="true">
        Explore Hair Care &amp; Style — Coming Soon
      </span>
    </section>
  );
}

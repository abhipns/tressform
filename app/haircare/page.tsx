// /haircare — Hair care: how to look after a haircut, and the owner's
// product picks with buy buttons (12.10.2026).
//
// The tips are the same ones the hairstyle cards use (lib/content/
// haircare.ts). The products are the owner's, added on /admin/products;
// each button goes through /go/[id], which counts the tap and opens the
// shop with the owner's affiliate link. Until products are added, the page
// shows the tips and says product picks are coming.
//
// 26.10.2026: a "Trending for this season's hairstyles" strip at the very
// top, so the owner's highlighted products are the first thing seen (see
// pickTrending in lib/content/haircare.ts).

import { AffiliateNote, ProductLink, TrendingStrip } from "@/components/CareBox";
import { GROUPS, KINDS, WASH, pickTrending } from "@/lib/content/haircare";
import { loadCareProducts, loadTaps30 } from "@/lib/haircareProducts";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Hair care — Tressform",
  description: "How to wash, style and look after your haircut, by hair type, with products that suit it.",
};

const TYPES = [
  { id: "straight", label: "Straight hair" },
  { id: "wavy", label: "Wavy hair" },
  { id: "curly", label: "Curly hair" },
] as const;

const STYLING = [
  { product: "Matte clay or paste", for: "Textured crops, quiffs, messy fringes", how: "A pea-sized bit on dry hair, worked in with your fingers." },
  { product: "Pomade", for: "Slick backs, side parts, comb overs, pompadours", how: "Comb through damp hair for a neat, sleek finish." },
  { product: "Curl cream", for: "Any curly cut", how: "Scrunch into very wet hair and let it dry on its own." },
  { product: "Light styling cream", for: "Longer men's cuts, side sweeps", how: "A little through towel-dried hair, so it moves without looking stiff." },
  { product: "Hair serum", for: "Bobs, lobs, layers and bangs on straight hair", how: "1–2 drops over the ends after blow-drying." },
  { product: "Sea-salt or texture spray", for: "Shags and wolf cuts", how: "Spray into damp hair and scrunch." },
];

export default async function HairCarePage() {
  const [products, taps30] = await Promise.all([loadCareProducts(), loadTaps30()]);
  const trending = pickTrending(products, taps30);
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[880px]">
        <TrendingStrip products={trending} from="haircare-trending" />

        <p className="eyebrow">Hair care</p>
        <h1 className="mb-3 text-[clamp(28px,4vw,40px)]">Look after your new cut</h1>
        <p className="max-w-[60ch] text-[16px] leading-[1.6] text-ink-body">
          A good cut stays good with the right wash routine and the right styling product. Here&apos;s what works for
          each hair type. Each hairstyle card on Tressform also shows the tips and products for that cut.
        </p>

        <h2 className="mt-10 text-[22px]">Washing, by hair type</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {TYPES.map((t) => (
            <div key={t.id} className="rounded-[16px] bg-bg-soft p-5">
              <p className="text-[16px] font-semibold text-ink-heading">{t.label}</p>
              <p className="mt-2 text-[14.5px] leading-[1.55]">{WASH[t.id]}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-[22px]">Which styling product</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {STYLING.map((s) => (
            <div key={s.product} className="rounded-[16px] border border-line bg-surface p-4">
              <p className="text-[15.5px] font-semibold text-ink-heading">{s.product}</p>
              <p className="mt-0.5 text-[13.5px] text-ink-muted">For: {s.for}</p>
              <p className="mt-1.5 text-[14.5px] leading-[1.5]">{s.how}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-[22px]">Products we suggest</h2>
        {products.length === 0 ? (
          <p className="mt-3 text-[15px] text-ink-muted">Our product picks are coming soon.</p>
        ) : (
          <>
            <AffiliateNote products={products} className="mt-2 !text-[13.5px]" />
            <p className="mt-1 text-[13.5px] text-ink-muted">
              The products are sold by those shops, not by Tressform; the price, delivery and returns are theirs.
            </p>
            {GROUPS.map((g) => {
              const list = products.filter((p) => KINDS[p.kind].group === g.id);
              if (list.length === 0) return null;
              return (
                <div key={g.id} className="mt-6">
                  <h3 className="text-[17px]">{g.label}</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {list.map((p) => (
                      <ProductLink key={p.id} product={p} from="haircare" />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}

// Doc table row 19, "Personalised Product Recommendations" — a post-payment
// transactional screen, per the table's own core content and the file
// header note in app/page.tsx: NOT a homepage section, belongs in the
// checkout/payment flow (same treatment as row 17, Post-Payment Bump
// Offer). That flow doesn't exist yet in this codebase (no app/results or
// checkout route), so this component is built with the exact copy from the
// comment on this row, ready to drop into that page once it's built —
// deliberately NOT imported into app/page.tsx.
//
// Product data is a placeholder array — wire to the real affiliate_products
// table (Part J) once that's populated, same as HairCare.tsx.
//
// 24.09.2026: image slots filled with AI-generated, Tressform-branded
// product renders (public/images/product-*.jpg) — mock packaging for a
// mock catalog, consistent with the placeholder names below; not real
// affiliate products, so no real brand/claims are being misrepresented.

import Image from "next/image";

const ROUTINE_STEPS = [
  { icon: "🧴", label: "Wash", body: "Products suited to keeping your hair clean and manageable" },
  { icon: "✂️", label: "Maintain", body: "Essentials to help keep your haircut looking fresh" },
  { icon: "✨", label: "Style", body: "Products that can help you recreate the finish shown in your result" },
];

const PRODUCTS = [
  { name: "Tressform Hair Shampoo", image: "/images/product-shampoo.jpg" },
  { name: "Tressform Styling Pomade", image: "/images/product-pomade.jpg" },
  { name: "Tressform Hair Serum", image: "/images/product-serum.jpg" },
];

export default function ProductRecommendations() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px] text-center">
        <h2 className="mb-3 text-[clamp(22px,3vw,28px)]">Your hairstyle results are ready.</h2>
        <p className="mb-6 text-[14.5px] leading-[1.6] text-ink-body">
          Save your recommendations, take your haircut instructions to your barber, and use this guide to maintain
          your look after the cut.
        </p>
        <p className="mb-9 text-[14.5px] leading-[1.6] text-ink-body">
          We&apos;ve picked a small selection of products that can help you wash, style, and maintain the look
          you&apos;ve just chosen — based on the needs of your hairstyle.
        </p>

        <p className="mb-4 text-[12px] font-bold uppercase tracking-[.03em] text-ink-muted">For your routine</p>
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {ROUTINE_STEPS.map((s) => (
            <div key={s.label} className="rounded-md2 border border-line bg-surface p-4 text-left">
              <p className="mb-1.5 text-[14px] font-semibold text-ink-heading">
                {s.icon} {s.label}
              </p>
              <p className="text-[12.5px] leading-[1.5] text-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mb-4 text-[12px] font-bold uppercase tracking-[.03em] text-ink-muted">
          A few products you may find useful
        </p>
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {PRODUCTS.map((p) => (
            <div key={p.name} className="rounded-md2 border border-line bg-surface p-4">
              <div className="mb-3 aspect-square overflow-hidden rounded-sm2 bg-bg-soft">
                <Image
                  src={p.image}
                  alt={p.name}
                  width={320}
                  height={320}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-[13px] font-semibold text-ink-heading">{p.name}</p>
            </div>
          ))}
        </div>

        <p className="text-[12px] text-ink-muted">
          Recommendations are curated for your hairstyle. Product links may be affiliate links, which means we may
          earn a small commission at no extra cost to you.
        </p>
      </div>
    </section>
  );
}

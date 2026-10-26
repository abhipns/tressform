"use client";

// "Looking after this cut" — on every hairstyle card (12.10.2026).
//
// Three short tips (wash, style, trim) and up to three matching products
// with a button to the shop. The tips come from lib/content/haircare.ts and
// are common to cuts of the same kind; the products are the owner's, from
// /admin/products. With no products yet, only the tips show.
//
// On the free list the box starts closed (one line to open it), so the
// cards stay short; on a paid preview it starts open.

import { useEffect, useState } from "react";
import type { Hairstyle, HairTexture } from "@/lib/content/hairstyles";
import { rupees } from "@/lib/stats";
import { AMAZON_DISCLOSURE, KINDS, SHOP_STYLE, careFor, goLink, productsFor, shopLabel, type CareProduct } from "@/lib/content/haircare";

let cache: Promise<CareProduct[]> | null = null;

/** The products, fetched once per visit and shared by every card. */
export function useCareProducts(): CareProduct[] {
  const [products, setProducts] = useState<CareProduct[]>([]);
  useEffect(() => {
    cache ??= fetch("/api/haircare/products")
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d) => (Array.isArray(d.products) ? d.products : []))
      .catch(() => {
        cache = null;
        return [];
      });
    let alive = true;
    cache.then((p) => alive && setProducts(p));
    return () => {
      alive = false;
    };
  }, []);
  return products;
}

function GroupIcon({ group }: { group: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (group === "wash") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M12 3c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0C6 10.2 9 7 12 3z" />
      </svg>
    );
  }
  if (group === "style") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="7" y="9" width="10" height="12" rx="2" />
        <path d="M9 9V6h6v3M10 3h4" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M4 8h16M6 8v8M9 8v8M12 8v8M15 8v8M18 8v8" />
    </svg>
  );
}

// 13.10.2026: one row per product with a button for each shop it's sold at
// (owner's choice: Amazon, Flipkart, Nykaa, Myntra, the brand's site). No
// prices yet: Amazon only allows prices from its own data service, which
// switches on once the owner's Associates account qualifies; EarnKaro gives
// no prices at all. 13.10.2026 (later): the owner's wording, "Buy on";
// each shop button in that shop's own colour; the product's Amazon photo in
// the circle when there is one (the kind's icon otherwise).
export function ProductLink({ product, from, styleId, compact = false }: { product: CareProduct; from: string; styleId?: string; compact?: boolean }) {
  const kind = KINDS[product.kind];
  return (
    <div className={`rounded-[12px] border border-line bg-surface ${compact ? "p-2.5" : "p-3"}`}>
      <div className="flex items-center gap-3">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Amazon's own hosted image, shown as Amazon allows.
          <img
            src={product.image}
            alt=""
            loading="lazy"
            className="h-14 w-14 shrink-0 rounded-full border border-line bg-white object-contain p-1"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-mint-pale text-mint-deep">
            <GroupIcon group={kind.group} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold uppercase tracking-[.03em] text-ink-muted">{kind.label}</span>
          <span className="block text-[14.5px] font-semibold leading-snug text-ink-heading">
            {product.brand ? `${product.brand} ` : ""}
            {product.title}
          </span>
          {product.note && <span className="block text-[12.5px] text-ink-muted">{product.note}</span>}
        </span>
      </div>
      <ShopButtons product={product} from={from} styleId={styleId} />
    </div>
  );
}

/** The "Buy on" row: one button per shop, each through /go/[id] so the tap is counted. */
function ShopButtons({ product, from, styleId }: { product: CareProduct; from: string; styleId?: string }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-2">
      <span className="text-[12.5px] text-ink-muted">Buy on</span>
      {product.shops.map((shop) => (
        <a
          key={shop}
          href={goLink(product.id, from, styleId, shop)}
          target="_blank"
          rel="sponsored noopener"
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold transition hover:opacity-90"
          style={{ background: SHOP_STYLE[shop].bg, color: SHOP_STYLE[shop].fg }}
          aria-label={`Buy ${product.brand ? product.brand + " " : ""}${product.title} on ${shopLabel(shop)}`}
        >
          {shopLabel(shop)}
          <span aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}

// 26.10.2026: "Trending for this season's hairstyles" at the top of
// /haircare — up to 6 products the owner ticked "Trending" (or, with none
// ticked, the most tapped this month). Photo, name, price when known, and
// the same buy buttons and small print as everywhere else. On phones the
// row scrolls sideways; on bigger screens it's a grid.
export function TrendingStrip({ products, from }: { products: CareProduct[]; from: string }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="trending-heading" className="mb-10">
      <h2 id="trending-heading" className="text-[22px]">
        Trending for this season&apos;s hairstyles
      </h2>
      <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
        {products.map((p) => {
          const kind = KINDS[p.kind];
          return (
            <div key={p.id} className="flex w-[72%] max-w-[260px] shrink-0 snap-start flex-col rounded-[14px] border border-line bg-surface p-3 sm:w-auto sm:max-w-none">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- Amazon's own hosted image, shown as Amazon allows.
                <img src={p.image} alt="" loading="lazy" className="aspect-square w-full rounded-[10px] bg-white object-contain p-2" />
              ) : (
                <span className="flex aspect-square w-full items-center justify-center rounded-[10px] bg-mint-pale text-mint-deep">
                  <GroupIcon group={kind.group} />
                </span>
              )}
              <span className="mt-2.5 block text-[12px] font-semibold uppercase tracking-[.03em] text-ink-muted">{kind.label}</span>
              <span className="block text-[14.5px] font-semibold leading-snug text-ink-heading">
                {p.brand ? `${p.brand} ` : ""}
                {p.title}
              </span>
              {p.pricePaise ? <span className="mt-1 block text-[15px] font-bold text-ink-heading">{rupees(p.pricePaise)}</span> : null}
              <div className="mt-auto">
                <ShopButtons product={p} from={from} />
              </div>
            </div>
          );
        })}
      </div>
      <AffiliateNote products={products} className="mt-2 !text-[13.5px]" />
    </section>
  );
}

/** The small print under product suggestions. */
export function AffiliateNote({ products, className = "" }: { products: CareProduct[]; className?: string }) {
  const amazon = products.some((p) => p.shops.includes("amazon"));
  return (
    <p className={`text-[12px] text-ink-muted ${className}`}>
      These are affiliate links: we may earn a small commission if you buy, at no extra cost to you.
      {amazon ? ` ${AMAZON_DISCLOSURE}` : ""}
    </p>
  );
}

export default function CareBox({
  style,
  texture,
  products,
  open = false,
  from,
}: {
  style: Hairstyle;
  texture: HairTexture;
  products: CareProduct[];
  open?: boolean;
  from: string;
}) {
  const care = careFor(style, texture);
  const picks = productsFor(products, style, texture);
  return (
    <details open={open} className="group mt-4 rounded-[14px] bg-surface p-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-ink-heading">
        Looking after this cut
        <span className="text-[13px] font-medium text-mint-deep group-open:hidden">Wash, style and products ▾</span>
        <span className="hidden text-[13px] font-medium text-mint-deep group-open:inline">Hide ▴</span>
      </summary>
      <ul className="mt-3 flex flex-col gap-1.5 text-[14.5px] leading-[1.45]">
        {care.tips.map((tip) => (
          <li key={tip} className="flex gap-2.5">
            <span className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full bg-mint" aria-hidden="true" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      {picks.length > 0 && (
        <>
          <p className="mt-4 text-[13.5px] font-semibold text-ink-heading">Products that suit it</p>
          <div className="mt-2 flex flex-col gap-2">
            {picks.map((p) => (
              <ProductLink key={p.id} product={p} from={from} styleId={style.id} compact />
            ))}
          </div>
          <AffiliateNote products={picks} className="mt-2" />
          <a href="/haircare" className="mt-1 inline-block text-[12.5px] font-semibold text-mint-deep">
            More hair care
          </a>
        </>
      )}
    </details>
  );
}

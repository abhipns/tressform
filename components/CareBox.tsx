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
import { KINDS, careFor, goLink, productsFor, type CareProduct } from "@/lib/content/haircare";

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

export function ProductLink({ product, from, styleId, compact = false }: { product: CareProduct; from: string; styleId?: string; compact?: boolean }) {
  const kind = KINDS[product.kind];
  const shop = `View on ${product.store && product.store !== "Other" ? product.store : "shop"} ↗`;
  return (
    <a
      href={goLink(product.id, from, styleId)}
      target="_blank"
      rel="sponsored noopener"
      className={`flex items-center gap-3 rounded-[12px] border border-line bg-surface ${compact ? "p-2.5" : "p-3"} transition hover:border-mint-deep`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-pale text-mint-deep">
        <GroupIcon group={kind.group} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold uppercase tracking-[.03em] text-ink-muted">{kind.label}</span>
        <span className="block text-[14.5px] font-semibold leading-snug text-ink-heading">
          {product.brand ? `${product.brand} ` : ""}
          {product.title}
        </span>
        {product.note && <span className="block text-[12.5px] text-ink-muted">{product.note}</span>}
        <span className="mt-0.5 block text-[13px] font-semibold text-mint-deep sm:hidden">{shop}</span>
      </span>
      <span className="hidden shrink-0 text-[13px] font-semibold text-mint-deep sm:block">{shop}</span>
    </a>
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
          <p className="mt-2 text-[12px] text-ink-muted">
            Affiliate links: we may earn a small commission if you buy, at no extra cost to you.{" "}
            <a href="/haircare" className="font-semibold text-mint-deep">
              More hair care
            </a>
          </p>
        </>
      )}
    </details>
  );
}

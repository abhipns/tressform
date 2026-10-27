// /hairstyles/[slug] — one style from "Hairstyles of the World"
// (26.10.2026, owner's approved layout). Its own title, description and
// structured data for Google.
//
// Shows the front picture clearly; the left side, right side and back as
// blurred, locked tiles marked ₹15; the barber notes blurred, "Made for your
// hair, with any purchase"; and the two buttons for this style on the
// customer's own face — the Full look ₹70 or just the front ₹25 — which go
// through the selfie upload to the single-picture checkout. Prices come from
// lib/pricing.ts.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BeforeAfter, { PicturePlaceholder } from "@/components/world/BeforeAfter";
import BarberPointText from "@/components/BarberPointText";
import { REGION_LABEL, WORLD_STYLES, tryLink, worldStyleBySlug, worldStyleId } from "@/lib/content/worldHairstyles";
import { FULL_LOOK_PRICE_PAISE, LINK_REWARD_PAISE, LINK_VISITORS_PER_REWARD, PICTURE_PRICE_PAISE, paiseToRupees } from "@/lib/pricing";
import { worldGalleryPictures } from "@/lib/worldPictures";

export const revalidate = 3600;

const SITE = "https://www.tressform.co.in";
const rupees = (paise: number) => `₹${paiseToRupees(paise).split(".")[0]}`;

export function generateStaticParams() {
  return WORLD_STYLES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const s = worldStyleBySlug(params.slug);
  if (!s) return {};
  const who = s.gender === "men" ? "men's" : "women's";
  const title = `${s.name} — ${s.country} ${who} hairstyle | Tressform`;
  const description = `${s.line} Suits ${s.best.slice(0, 3).join(", ").toLowerCase()} faces. See it on your own face with Tressform.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/hairstyles/${s.slug}` },
    openGraph: { title, description, url: `${SITE}/hairstyles/${s.slug}`, type: "article" },
  };
}

export default async function WorldStylePage({ params }: { params: { slug: string } }) {
  const s = worldStyleBySlug(params.slug);
  if (!s) return notFound();
  const pictures = await worldGalleryPictures();
  const before = pictures[`model:${s.region}-${s.gender}`] ?? null;
  const after = pictures[`style:${s.slug}`] ?? null;
  const id = worldStyleId(s.slug);
  const who = s.gender === "men" ? "Men" : "Women";

  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: s.name,
      headline: `${s.name} — a ${s.gender === "men" ? "men's" : "women's"} hairstyle from ${s.country}`,
      description: s.line,
      genre: "Hairstyle",
      url: `${SITE}/hairstyles/${s.slug}`,
      ...(after && !after.startsWith("data:") ? { image: after } : {}),
      countryOfOrigin: { "@type": "Country", name: s.country },
      keywords: [s.name, `${s.country} hairstyle`, `${s.length.toLowerCase()} hair`, ...s.best.map((f) => `${f.toLowerCase()} face`)].join(", "),
      publisher: { "@type": "Organization", name: "Tressform", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Hairstyles of the World", item: `${SITE}/hairstyles` },
        { "@type": "ListItem", position: 2, name: s.name, item: `${SITE}/hairstyles/${s.slug}` },
      ],
    },
  ];

  const sides = [
    { key: "left", label: "Left side" },
    { key: "right", label: "Right side" },
    { key: "back", label: "Back" },
  ] as const;

  return (
    <section className="wrap py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured) }} />
      <div className="mx-auto max-w-[1040px]">
        <a href="/hairstyles" className="text-[13.5px] font-semibold text-mint-deep">
          ← All hairstyles of the world
        </a>
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* The pictures */}
          <div>
            <div className="overflow-hidden rounded-[20px] border border-line">
              <BeforeAfter before={before} after={after} alt={`${s.name}, front view`} />
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-3">
              {sides.map((side) => (
                <li key={side.key}>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-header-dark">
                    {after ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={after} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-[12px]" />
                    ) : (
                      <PicturePlaceholder label="" />
                    )}
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white">
                      <span aria-hidden="true">🔒</span>
                      <span className="text-[13px] font-bold drop-shadow">{rupees(PICTURE_PRICE_PAISE[side.key])}</span>
                    </span>
                  </div>
                  <p className="mt-1.5 text-center text-[13px] font-semibold text-ink-heading">{side.label}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* About the style */}
          <div>
            <p className="text-[12.5px] font-semibold uppercase tracking-[.04em] text-ink-muted">
              <span className="mr-1.5 rounded bg-bg-soft px-1.5 py-0.5 font-mono text-[11.5px] text-ink-heading">{s.code}</span>
              {s.country} · {REGION_LABEL[s.region]} · {who}
            </p>
            <h1 className="mt-2 text-[clamp(28px,4.5vw,42px)] leading-[1.1]">{s.name}</h1>
            <p className="mt-3 text-[16px] leading-[1.6] text-ink-body">{s.line}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-mint-pale px-2.5 py-1 text-[12.5px] font-semibold text-mint-deep">{s.length}</span>
              {s.best.map((f) => (
                <span key={f} className="rounded-full bg-bg-soft px-2.5 py-1 text-[12.5px] font-semibold text-ink-heading">
                  {f} face
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {/* 27.10.2026 (owner): the ₹25 front view is the main offer everywhere a style is locked. */}
              <a href={tryLink(id, "front")} className="btn-primary w-full !py-3.5 !text-[16px]">
                See it on your face – {rupees(PICTURE_PRICE_PAISE.front)}
              </a>
              <a href={tryLink(id, "all")} className="btn-secondary w-full !py-3 !text-[15px]">
                Full look {rupees(FULL_LOOK_PRICE_PAISE)} (best value)
              </a>
              <p className="text-[12.5px] text-ink-muted">
                Upload a selfie first; we read your face shape and make this style on your own photo. The Full look is the
                front, both sides and the back.
              </p>
            </div>

            <div className="relative mt-7 overflow-hidden rounded-[16px] bg-bg-soft p-5">
              <p className="text-[15.5px] font-semibold text-ink-heading">What to tell your barber or stylist</p>
              <ul className="mt-2 flex select-none flex-col gap-1 text-[14.5px] leading-[1.45] blur-[5px]" aria-hidden="true">
                {s.barber.map((point) => (
                  <li key={point} className="flex gap-2.5">
                    <span className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full bg-mint" />
                    <BarberPointText point={point} />
                  </li>
                ))}
              </ul>
              <span className="absolute inset-x-0 bottom-0 top-10 flex items-center justify-center px-6 text-center text-[14.5px] font-semibold text-ink-heading">
                Made for your hair, with any purchase
              </span>
            </div>

            <p className="mt-5 text-[14px] font-semibold text-mint-deep">
              Share your look: every {LINK_VISITORS_PER_REWARD} people who open your link = {rupees(LINK_REWARD_PAISE)} credit
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

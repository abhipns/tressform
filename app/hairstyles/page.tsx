// /hairstyles — "Hairstyles of the World" (26.10.2026, owner's request and
// approved layout). About 100 popular cuts from India, Korea, Japan,
// Europe, Africa and beyond (lib/content/worldHairstyles.ts), filtered by
// Men / Women and region, each with a before-and-after picture made by the
// owner in the Studio, and a page of its own (/hairstyles/[slug]).

import type { Metadata } from "next";
import WorldGallery, { type GalleryStyle } from "@/components/world/WorldGallery";
import { WORLD_STYLES, worldStyleId } from "@/lib/content/worldHairstyles";
import { worldGalleryPictures } from "@/lib/worldPictures";

// New pictures from the Studio show within the hour.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Hairstyles of the World — Tressform",
  description:
    "About 100 popular haircuts and hairstyles from India, Korea, Japan, Europe, Africa, the Americas, the Middle East and Oceania. See which suit your face.",
  alternates: { canonical: "https://www.tressform.co.in/hairstyles" },
  openGraph: {
    title: "Hairstyles of the World",
    description: "Popular cuts from India, Korea, Japan, Europe, Africa and beyond — and whether they suit your face.",
    url: "https://www.tressform.co.in/hairstyles",
    type: "website",
  },
};

export default async function HairstylesPage() {
  const pictures = await worldGalleryPictures();
  const styles: GalleryStyle[] = WORLD_STYLES.map((s) => ({
    slug: s.slug,
    id: worldStyleId(s.slug),
    name: s.name,
    gender: s.gender,
    region: s.region,
    country: s.country,
    code: s.code,
    line: s.line,
    length: s.length,
    faces: s.best,
    before: pictures[`model:${s.region}-${s.gender}`] ?? null,
    after: pictures[`style:${s.slug}`] ?? null,
  }));

  return (
    <section className="wrap py-14 sm:py-16">
      <div className="mx-auto max-w-[1180px]">
        <header className="max-w-[720px]">
          <p className="eyebrow">About 100 styles from around the world</p>
          <h1 className="mb-3 text-[clamp(32px,5.5vw,56px)] leading-[1.05]">Hairstyles of the World</h1>
          <p className="text-[16.5px] leading-[1.6] text-ink-body">
            Popular cuts from India, Korea, Japan, Europe, Africa and beyond.
          </p>
        </header>
        <div className="mt-8">
          <WorldGallery styles={styles} />
        </div>
      </div>
    </section>
  );
}

// "See this on your face" — buy one hairstyle on your own photo, picture by
// picture (26.10.2026, owner's request). Shown under a hairstyle the
// customer hasn't paid for: the front view, or the Full look (front, both
// sides and back), highlighted. Prices come from lib/pricing.ts.
//
// The Full look costs the same as the four views bought one by one
// (₹25 + 3 × ₹15 = ₹70), so it is labelled "All 4 views", not as a saving.

import { FULL_LOOK_PRICE_PAISE, PICTURE_PRICE_PAISE, paiseToRupees } from "@/lib/pricing";

const rupees = (paise: number) => `₹${paiseToRupees(paise).split(".")[0]}`;

export function pictureCheckoutLink(styleId: string, photoId: string, views: "front" | "all"): string {
  return `/checkout?style=${encodeURIComponent(styleId)}&photo=${encodeURIComponent(photoId)}&views=${views}`;
}

export default function PictureOffer({ styleId, photoId, dark = false }: { styleId: string; photoId: string; dark?: boolean }) {
  return (
    <div className="mt-2">
      <p className={`text-[13px] font-semibold ${dark ? "text-white" : "text-ink-heading"}`}>See this on your face</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <a
          href={pictureCheckoutLink(styleId, photoId, "front")}
          className={`rounded-full border-[1.5px] px-3.5 py-1.5 text-[13.5px] font-semibold transition ${
            dark ? "border-white/40 text-white hover:border-white" : "border-line bg-surface text-ink-heading hover:border-ink-heading"
          }`}
        >
          Front {rupees(PICTURE_PRICE_PAISE.front)}
        </a>
        <a
          href={pictureCheckoutLink(styleId, photoId, "all")}
          className="relative rounded-full bg-lilac px-3.5 py-1.5 text-[13.5px] font-bold text-header-dark shadow-card transition hover:opacity-90"
        >
          Full look {rupees(FULL_LOOK_PRICE_PAISE)}
          <span className="ml-1.5 rounded-full bg-header-dark/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.03em]">
            All 4 views
          </span>
        </a>
      </div>
    </div>
  );
}

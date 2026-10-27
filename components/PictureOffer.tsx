// "See it on your face" — buy one hairstyle on your own photo, picture by
// picture (26.10.2026, owner's request). Shown under a hairstyle the
// customer hasn't paid for. Prices come from lib/pricing.ts.
//
// 27.10.2026 (owner, to fix the checkout drop-off): the ₹25 front view is
// the first and most visible offer — the main button — with "Full look ₹70
// (best value)" next to it (the owner's wording), and the packs below. On a
// narrow card the two buttons stack, the ₹25 one on top.

import { FRONT_OFFER, FULL_OFFER, pictureCheckoutLink } from "@/lib/pictureOffer";

export { FRONT_OFFER, FULL_OFFER, pictureCheckoutLink };

export default function PictureOffer({ styleId, photoId, compact = false }: { styleId: string; photoId: string; compact?: boolean }) {
  return (
    // Stacked on phones (₹25 on top), side by side on wider screens unless the card is narrow.
    <div className={`mt-2.5 flex flex-col items-stretch gap-2 ${compact ? "" : "sm:flex-row"}`}>
      <a
        href={pictureCheckoutLink(styleId, photoId, "front")}
        className="btn-primary flex-1 justify-center !px-4 !py-2.5 text-center !text-[15px]"
      >
        {FRONT_OFFER}
      </a>
      <a
        href={pictureCheckoutLink(styleId, photoId, "all")}
        className="inline-flex flex-1 items-center justify-center rounded-full border-[1.5px] border-ink-heading bg-surface px-4 py-2 text-center text-[14px] font-semibold text-ink-heading transition hover:bg-bg-soft"
      >
        {FULL_OFFER}
      </a>
    </div>
  );
}

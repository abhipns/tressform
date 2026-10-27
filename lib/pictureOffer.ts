// The wording and links of the single-picture offer (27.10.2026), shared by
// components/PictureOffer.tsx and the tests. Prices come from lib/pricing.ts.

import { FULL_LOOK_PRICE_PAISE, PICTURE_PRICE_PAISE, paiseToRupees } from "./pricing";

const rupees = (paise: number) => `₹${paiseToRupees(paise).split(".")[0]}`;

/** The ₹25 front view: the main offer wherever a hairstyle is locked (owner, 27.10.2026). */
export const FRONT_OFFER = `See it on your face – ${rupees(PICTURE_PRICE_PAISE.front)}`;
/** The owner's wording for the Full look. */
export const FULL_OFFER = `Full look ${rupees(FULL_LOOK_PRICE_PAISE)} (best value)`;

export function pictureCheckoutLink(styleId: string, photoId: string, views: "front" | "all"): string {
  return `/checkout?style=${encodeURIComponent(styleId)}&photo=${encodeURIComponent(photoId)}&views=${views}`;
}

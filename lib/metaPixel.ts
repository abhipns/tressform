// Tressform — the Meta Pixel: tells Meta (Facebook / Instagram ads) what
// people do after tapping an ad, so ads can be aimed at people who buy, and
// the owner can see which ad led to sales (21.10.2026, before the first ads).
//
// Off unless NEXT_PUBLIC_META_PIXEL_ID is set in Vercel. Events sent:
//   PageView              every page
//   CompleteRegistration  a new account signs in for the first time
//   Lead                  a photo has been read (the hairstyle list is shown)
//   Contact               a WhatsApp number was given
//   InitiateCheckout      "Pay" was pressed (with the pack's price)
//   Purchase              a payment was confirmed (price in INR), once per order
// Nothing personal is sent: no name, email, phone or photo.
// Client-only.

export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();

type Fbq = (cmd: "track" | "trackCustom", event: string, params?: Record<string, unknown>, opts?: { eventID?: string }) => void;

export function trackMeta(event: string, params?: Record<string, unknown>, eventId?: string) {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq !== "function") return;
  try {
    fbq("track", event, params, eventId ? { eventID: eventId } : undefined);
  } catch {
    /* tracking must never break the page */
  }
}

/** Purchase, once per order on this device (the results page can be opened again). */
export function trackPurchaseOnce(orderId: string, rupees: number, packName: string | null) {
  try {
    const key = `tf_px_purchase:${orderId}`;
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
  } catch {
    /* not remembered: may count twice on this device, rarely */
  }
  trackMeta("Purchase", { value: rupees, currency: "INR", content_name: packName ?? "Tressform pack" }, `purchase-${orderId}`);
}

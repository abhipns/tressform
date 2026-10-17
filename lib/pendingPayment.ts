// A payment the customer started in this tab but may not have finished
// (17.10.2026, owner: pressing Back on PayU's page left him with no way to
// carry on paying). The checkout page saves it just before PayU opens; the
// hairstyles screen reads it and, while that order is still unpaid, shows
// "Your payment wasn't completed" with a button back to checkout.
// Kept for this tab only (sessionStorage), and dropped once it is paid.

const KEY = "tressform_pending_payment";
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface PendingPayment {
  orderId: string;
  tier: string;
  at: number;
}

export function savePendingPayment(orderId: string, tier: string) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ orderId, tier, at: Date.now() }));
  } catch {
    /* not remembered: the customer can still choose a pack again */
  }
}

export function readPendingPayment(): PendingPayment | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PendingPayment>;
    if (typeof p.orderId !== "string" || typeof p.tier !== "string" || typeof p.at !== "number") return null;
    if (Date.now() - p.at > MAX_AGE_MS) {
      clearPendingPayment();
      return null;
    }
    return p as PendingPayment;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

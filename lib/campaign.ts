// Tressform — which ad brought a visitor (21.10.2026, before the first
// Meta ads).
//
// Ad links carry tags such as ?utm_source=meta&utm_campaign=diwali-men.
// The first page a visitor opens from an ad keeps those tags on the device
// for 30 days (the newest ad wins), and they are sent with page visits and
// with orders, so the Dashboard can show visits, purchases and money by ad
// campaign. A Meta ad link without tags still counts as "meta" (fbclid, or
// coming from facebook.com / instagram.com). Nothing personal is kept.

export interface Campaign {
  source: string;
  campaign: string | null;
  content: string | null;
}

const KEY = "tf_campaign";
const DAYS = 30;

/** Keep only plain characters, at most 80. */
export function cleanTag(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 80).replace(/[^A-Za-z0-9 _.\-+|:/]/g, "");
  return t || null;
}

/** The campaign in a page's address or referrer, if any. */
export function campaignFrom(search: string, referrerHost: string): Campaign | null {
  const q = new URLSearchParams(search);
  const source = cleanTag(q.get("utm_source"));
  if (source) return { source: source.toLowerCase(), campaign: cleanTag(q.get("utm_campaign")), content: cleanTag(q.get("utm_content")) };
  const ref = referrerHost.toLowerCase();
  if (q.get("fbclid") || /(^|\.)(facebook|instagram)\.com$/.test(ref)) {
    return { source: /instagram/.test(ref) ? "instagram" : "meta", campaign: null, content: null };
  }
  return null;
}

/** Remember the campaign of this visit (client-only). */
export function rememberCampaign(): void {
  try {
    let ref = "";
    try {
      ref = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {
      ref = "";
    }
    const c = campaignFrom(window.location.search, ref);
    if (c) window.localStorage.setItem(KEY, JSON.stringify({ ...c, at: Date.now() }));
  } catch {
    /* storage blocked: not tracked */
  }
}

/** The campaign that brought this visitor in the last 30 days (client-only). */
export function currentCampaign(): Campaign | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Campaign & { at?: number };
    if (!c.at || Date.now() - c.at > DAYS * 86_400_000) return null;
    const source = cleanTag(c.source);
    return source ? { source, campaign: cleanTag(c.campaign), content: cleanTag(c.content) } : null;
  } catch {
    return null;
  }
}

/** The campaign as the server stores it, checked again. */
export function campaignColumns(v: unknown): { utm_source: string | null; utm_campaign: string | null; utm_content: string | null } {
  const c = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const source = cleanTag(c.source);
  return {
    utm_source: source ? source.toLowerCase() : null,
    utm_campaign: source ? cleanTag(c.campaign) : null,
    utm_content: source ? cleanTag(c.content) : null,
  };
}

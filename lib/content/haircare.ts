// Tressform — looking after a haircut: wash and styling tips, and which
// kinds of product to suggest, for every hairstyle card.
//
// 12.10.2026, the owner's plan: hair-care tips and product suggestions on
// the cards, with "buy" links that go to the real shop through the
// owner's affiliate links. The owner asked for this to be COMMON, not
// written style by style: most cuts need the same few kinds of product.
// So a card's advice is put together from three small tables:
//
//   1. WASH   — by the customer's hair type (straight / wavy / curly), with
//               one change for clipper cuts.
//   2. STYLE  — by the cut's "finish" (matte clay, pomade, curl cream…),
//               worked out from the hairstyle's family below.
//   3. TRIM   — how often to go back to the barber, by family and length.
//
// The products themselves live in the database (affiliate_products), added
// by the owner on /admin/products. Each product has a `kind` from KINDS
// below; a card asks for kinds, and the first active product of each kind
// that suits the customer's gender and hair type is shown.

import type { Hairstyle, HairTexture, HairGender } from "./hairstyles";

// ------------------------------------------------------------- product kinds

export const KINDS = {
  "shampoo-mild": { label: "Mild shampoo", group: "wash" },
  "shampoo-sulphate-free": { label: "Sulphate-free shampoo", group: "wash" },
  conditioner: { label: "Conditioner", group: "wash" },
  "hair-mask": { label: "Hair mask", group: "wash" },
  "matte-clay": { label: "Matte clay or paste", group: "style" },
  pomade: { label: "Pomade", group: "style" },
  wax: { label: "Hair wax", group: "style" },
  "styling-cream": { label: "Light styling cream", group: "style" },
  "curl-cream": { label: "Curl cream", group: "style" },
  serum: { label: "Hair serum", group: "style" },
  "texture-spray": { label: "Sea-salt or texture spray", group: "style" },
  "heat-protectant": { label: "Heat protectant", group: "style" },
  "wide-tooth-comb": { label: "Wide-tooth comb", group: "tools" },
  "round-brush": { label: "Round brush", group: "tools" },
  other: { label: "Other", group: "tools" },
} as const;

export type ProductKind = keyof typeof KINDS;
export const KIND_IDS = Object.keys(KINDS) as ProductKind[];

export const GROUPS = [
  { id: "wash", label: "Wash and condition" },
  { id: "style", label: "Style" },
  { id: "tools", label: "Tools" },
] as const;

/**
 * 13.10.2026: each product can be bought at several shops; the card shows a
 * button per shop the owner has a link for. Amazon links are built from the
 * product's code (ASIN) and the owner's Associate ID; the others are the
 * owner's affiliate links (EarnKaro).
 */
export const SHOPS = [
  { id: "amazon", label: "Amazon" },
  { id: "flipkart", label: "Flipkart" },
  { id: "nykaa", label: "Nykaa" },
  { id: "myntra", label: "Myntra" },
  { id: "brand", label: "Brand website" },
] as const;
export type ShopId = (typeof SHOPS)[number]["id"];
export const SHOP_IDS = SHOPS.map((s) => s.id) as ShopId[];
export const shopLabel = (id: ShopId) => SHOPS.find((s) => s.id === id)?.label ?? "Shop";

/** The owner's Amazon Associates ID (public: it is part of every Amazon link). */
export const AMAZON_TAG = "tressform-21";
/** Amazon asks for this sentence wherever its links appear. */
export const AMAZON_DISCLOSURE = "As an Amazon Associate, Tressform earns from qualifying purchases.";

/** The product code in an Amazon link (…/dp/B0ABC12345…), or null. */
export function asinFromLink(link: string): string | null {
  const m = link.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return m ? m[1].toUpperCase() : /^[A-Z0-9]{10}$/i.test(link.trim()) ? link.trim().toUpperCase() : null;
}
/**
 * 13.10.2026: product photos may only come from Amazon's own image links
 * (Associates "SiteStripe → Image" or its data service), which Amazon hosts.
 * The owner pastes the SiteStripe code or the image address; this keeps only
 * an https address on one of Amazon's image hosts, or null.
 */
const AMAZON_IMAGE_HOSTS = /^(m\.media-amazon\.com|images-na\.ssl-images-amazon\.com|images-eu\.ssl-images-amazon\.com|ws-in\.amazon-adsystem\.com)$/i;
export function amazonImageFrom(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  // SiteStripe writes the image as src="//ws-in.amazon-adsystem.com/…" (no https:), followed by
  // a 1×1 tracking pixel from ir-in.amazon-adsystem.com, which is never taken as the photo.
  const candidates = [...text.matchAll(/(?:https:)?\/\/[^"'\s>]+/gi)].map((m) =>
    (m[0].startsWith("//") ? "https:" + m[0] : m[0]).replace(/&amp;/g, "&")
  );
  for (const c of candidates) {
    try {
      const u = new URL(c);
      if (u.protocol === "https:" && AMAZON_IMAGE_HOSTS.test(u.hostname)) return u.toString();
    } catch {
      /* not a link */
    }
  }
  return null;
}

/** Each shop's button colour (the shop's own brand colour; no logos are drawn). */
export const SHOP_STYLE: Record<ShopId, { bg: string; fg: string }> = {
  amazon: { bg: "#FF9900", fg: "#131921" },
  flipkart: { bg: "#2874F0", fg: "#FFFFFF" },
  nykaa: { bg: "#FC2779", fg: "#FFFFFF" },
  myntra: { bg: "#FF3F6C", fg: "#FFFFFF" },
  brand: { bg: "#16261C", fg: "#FFFFFF" },
};

export function amazonLink(asin: string): string {
  return `https://www.amazon.in/dp/${asin}?tag=${AMAZON_TAG}`;
}

/** A product as the site shows it (no admin-only fields). */
export interface CareProduct {
  id: string;
  title: string;
  brand: string | null;
  kind: ProductKind;
  /** The shops this product can be bought at, in the order the buttons show. */
  shops: ShopId[];
  gender: "all" | HairGender;
  hairTypes: HairTexture[];
  note: string | null;
  /** The product photo: Amazon's own image (from SiteStripe), or null. */
  image: string | null;
  /** 26.10.2026: the owner ticked "Trending" on /admin/products. */
  trending?: boolean;
  /** 26.10.2026: the price in paise, shown only when the database has one. */
  pricePaise?: number | null;
}

// ------------------------------------------------------------------ finishes

type Finish = "none" | "matte-clay" | "pomade" | "wax" | "styling-cream" | "curl-cream" | "serum" | "texture-spray";

const FAMILY_FINISH: Record<string, Finish> = {
  // men
  quiff: "matte-clay",
  part: "pomade",
  crop: "matte-clay",
  clipper: "none",
  slick: "pomade",
  long: "styling-cream",
  curly: "curl-cream",
  spiky: "wax",
  classic: "matte-clay",
  sweep: "styling-cream",
  // women
  layers: "serum",
  bangs: "serum",
  lob: "serum",
  bob: "serum",
  framing: "serum",
  "back-shape": "serum",
  shag: "texture-spray",
  pixie: "matte-clay",
};

const STYLE_FINISH: Record<string, Finish> = {
  "m-pompadour": "pomade",
};

/** The cut's styling product, adjusted to the customer's hair: curls get curl cream. */
export function finishFor(style: Hairstyle, texture: HairTexture): Finish {
  const base = STYLE_FINISH[style.id] ?? FAMILY_FINISH[style.family] ?? "styling-cream";
  if (base === "none") return "none";
  if (texture === "curly" && base !== "pomade" && base !== "wax") return "curl-cream";
  if (texture === "wavy" && base === "serum" && style.gender === "women") return "styling-cream";
  return base;
}

// -------------------------------------------------------------------- tips

export const WASH: Record<HairTexture, string> = {
  straight:
    "Wash every 2–3 days with a mild shampoo, and put conditioner on the lengths only, not the scalp.",
  wavy: "Wash 2–3 times a week with a sulphate-free shampoo, and condition every time so the waves stay soft, not frizzy.",
  curly:
    "Wash only 1–2 times a week with a sulphate-free shampoo. Condition every time, and comb curls with a wide-tooth comb while the conditioner is in.",
};

const WASH_CLIPPER = "Wash 2–3 times a week with a mild shampoo. Hair this short needs no conditioner and dries in minutes.";

const STYLE: Record<Finish, string> = {
  none: "No styling product needed: towel-dry and go.",
  "matte-clay":
    "Style dry hair with a pea-sized bit of matte clay or paste: rub it between your palms, then push the hair into shape with your fingers.",
  pomade: "Comb a little pomade through damp hair for the neat, sleek finish. A water-based one washes out easily.",
  wax: "Use a small bit of wax on dry hair and pinch the ends up into shape.",
  "styling-cream":
    "Work a little light styling cream through towel-dried hair and let it dry on its own, so it moves without looking stiff.",
  "curl-cream":
    "Scrunch curl cream into very wet hair and let it dry on its own (or use a diffuser). Don't brush curls once they're dry.",
  serum:
    "Use a heat protectant before blow-drying with a round brush, then smooth 1–2 drops of serum over the ends.",
  "texture-spray": "Spray a sea-salt or texture spray into damp hair and scrunch it for the soft, piecey shape.",
};

function trimTip(style: Hairstyle): string {
  if (style.family === "clipper") return "Get a clipper touch-up every 2–3 weeks to keep it sharp.";
  if (style.gender === "men") {
    if (style.needs === "long") return "Get the shape and the ends tidied every 6–8 weeks.";
    if (/fade|taper|undercut|two-block|high-and-tight/.test(style.id)) {
      return "Get the sides and back tidied every 3–4 weeks to keep the fade clean.";
    }
    return "Get it trimmed every 4–5 weeks to keep the shape.";
  }
  if (style.family === "pixie") return "Get it trimmed every 4–6 weeks so the shape stays neat.";
  if (style.needs === "chin" || style.needs === "ear") return "Get it trimmed every 6–8 weeks to keep the line crisp.";
  if (style.needs === "shoulder") return "Get it trimmed every 8–10 weeks to keep the shape.";
  return "Get the ends and layers trimmed every 10–12 weeks.";
}

// -------------------------------------------------------------- the card

export interface Care {
  tips: string[];
  /** The kinds of product to suggest, most useful first. */
  kinds: ProductKind[];
}

export function careFor(style: Hairstyle, texture: HairTexture): Care {
  const finish = finishFor(style, texture);
  const clipper = style.family === "clipper";
  const tips = [clipper ? WASH_CLIPPER : WASH[texture], STYLE[finish], trimTip(style)];

  const shampoo: ProductKind = clipper || texture === "straight" ? "shampoo-mild" : "shampoo-sulphate-free";
  const kinds: ProductKind[] = [shampoo];
  if (finish !== "none") kinds.push(finish);
  if (!clipper) kinds.push(texture === "curly" ? "hair-mask" : "conditioner");
  if (finish === "serum") kinds.push("heat-protectant");
  if (texture === "curly") kinds.push("wide-tooth-comb");
  return { tips, kinds };
}

/**
 * Pick up to `max` products for a card: one per kind, in the card's order,
 * suiting the customer's gender and hair type. A kind with nothing in stock
 * is skipped; a missing sulphate-free shampoo falls back to a mild one,
 * and a missing hair mask to a conditioner.
 */
export function productsFor(
  products: CareProduct[],
  style: Hairstyle,
  texture: HairTexture,
  max = 3
): CareProduct[] {
  const fits = (p: CareProduct) =>
    (p.gender === "all" || p.gender === style.gender) && (p.hairTypes.length === 0 || p.hairTypes.includes(texture));
  const fallback: Partial<Record<ProductKind, ProductKind>> = {
    "shampoo-sulphate-free": "shampoo-mild",
    "hair-mask": "conditioner",
  };
  const chosen: CareProduct[] = [];
  for (const kind of careFor(style, texture).kinds) {
    if (chosen.length >= max) break;
    const tryKinds = [kind, fallback[kind]].filter(Boolean) as ProductKind[];
    for (const k of tryKinds) {
      const hit = products.find((p) => p.kind === k && fits(p) && !chosen.includes(p));
      if (hit) {
        chosen.push(hit);
        break;
      }
    }
  }
  return chosen;
}

/** The link that records the tap and then opens the shop. */
export function goLink(productId: string, from: string, styleId?: string, shop?: ShopId): string {
  const q = new URLSearchParams({ from });
  if (shop) q.set("shop", shop);
  if (styleId) q.set("style", styleId);
  return `/go/${productId}?${q.toString()}`;
}

export const TRENDING_MAX = 6;

/**
 * 26.10.2026: the "Trending for this season's hairstyles" strip on /haircare.
 * The owner chooses: the products ticked "Trending" (in the owner's order).
 * With none ticked, the most-tapped products of the last 30 days
 * (`taps30` = product id → taps), leaving out products nobody tapped.
 */
export function pickTrending(products: CareProduct[], taps30: Record<string, number>, max = TRENDING_MAX): CareProduct[] {
  const ticked = products.filter((p) => p.trending);
  if (ticked.length > 0) return ticked.slice(0, max);
  return products
    .filter((p) => (taps30[p.id] ?? 0) > 0)
    .sort((a, b) => taps30[b.id] - taps30[a.id])
    .slice(0, max);
}

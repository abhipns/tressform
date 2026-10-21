// Tressform — salon onboarding: the lists of choices, the checks, and the
// shape of a salon (21.10.2026, owner's brief).
//
// Used by both the onboarding page (components/salons/*) and the server
// (/api/salons/*), so the browser and the server check a salon the same way.
// The server always checks again: nothing a browser sends is trusted.
//
// Why so much is fixed lists rather than free text: Tressform will later
// match a customer's chosen hairstyle to salons and stylists ("Style
// Match"). For that, "what is this salon good at" has to be the same words
// for every salon — "FADE", "CURLY_HAIR" — not each owner's own spelling.
// The ids are stored in the database; the labels are what people see.

import { cleanIndianMobile } from "./whatsapp";

export interface Choice {
  id: string;
  label: string;
}

export const CUSTOMER_TYPES: Choice[] = [
  { id: "MEN", label: "Men" },
  { id: "WOMEN", label: "Women" },
  { id: "UNISEX", label: "Unisex" },
];

/** The salon's place in the market — NOT a paid plan. */
export const MARKET_TIERS: (Choice & { hint: string })[] = [
  { id: "Standard", label: "Standard", hint: "Everyday, good value" },
  { id: "Premium", label: "Premium", hint: "Upmarket, more services" },
  { id: "Luxury", label: "Luxury", hint: "High-end experience" },
  { id: "Ultra Premium", label: "Ultra Premium", hint: "Top-of-the-line, celebrity level" },
];

export const SERVICE_GROUPS: { title: string; items: Choice[] }[] = [
  {
    title: "Hair",
    items: [
      { id: "HAIRCUT", label: "Haircut" },
      { id: "HAIR_STYLING", label: "Hair Styling" },
      { id: "BEARD_GROOMING", label: "Beard / Grooming" },
      { id: "HAIR_COLOUR", label: "Hair Colour" },
      { id: "HIGHLIGHTS_BALAYAGE", label: "Highlights / Balayage" },
      { id: "HAIR_SPA", label: "Hair Spa" },
      { id: "KERATIN_SMOOTHING", label: "Keratin / Smoothing" },
      { id: "HAIR_TREATMENT", label: "Hair Treatment" },
      { id: "BRIDAL_HAIR", label: "Bridal Hair" },
    ],
  },
  {
    title: "Other",
    items: [
      { id: "FACIAL_SKIN", label: "Facial / Skin" },
      { id: "MAKEUP", label: "Makeup" },
      { id: "MANI_PEDI", label: "Manicure / Pedicure" },
      { id: "BRIDAL_SERVICES", label: "Bridal Services" },
      { id: "OTHER", label: "Other" },
    ],
  },
];
export const SERVICES: Choice[] = SERVICE_GROUPS.flatMap((g) => g.items);

/** What the salon (or a stylist) is particularly good at — the heart of Style Match later. */
export const SPECIALITIES: Choice[] = [
  { id: "FADE", label: "Fade" },
  { id: "TAPER", label: "Taper" },
  { id: "CREW_CUT", label: "Crew Cut" },
  { id: "UNDERCUT", label: "Undercut" },
  { id: "LONG_HAIR", label: "Long Hair" },
  { id: "CURLY_HAIR", label: "Curly Hair" },
  { id: "WAVY_HAIR", label: "Wavy Hair" },
  { id: "SHORT_WOMENS_HAIR", label: "Short Women's Hair" },
  { id: "BOB", label: "Bob" },
  { id: "LAYERED_HAIR", label: "Layered Hair" },
  { id: "BRIDAL_HAIR", label: "Bridal Hair" },
  { id: "HAIR_COLOUR", label: "Hair Colour" },
  { id: "BALAYAGE", label: "Balayage" },
  { id: "CREATIVE_TRENDING", label: "Creative / Trending Styles" },
  { id: "OTHER", label: "Other" },
];

export const AMENITIES: Choice[] = [
  { id: "AC", label: "Air-conditioned" },
  { id: "PARKING", label: "Parking" },
  { id: "WIFI", label: "Wi-Fi" },
  { id: "UPI_CARDS", label: "UPI / cards accepted" },
  { id: "WHEELCHAIR", label: "Wheelchair access" },
  { id: "KIDS", label: "Kids welcome" },
  { id: "APPOINTMENTS", label: "Appointments" },
  { id: "WALK_INS", label: "Walk-ins welcome" },
  { id: "HOME_SERVICE", label: "Home service" },
];

export type ImageType = "EXTERIOR" | "INTERIOR" | "PORTFOLIO" | "RECEPTION" | "STYLING_AREA" | "HAIRCUT" | "HAIR_COLOUR" | "TEAM";

export const IMAGE_SLOTS: { type: ImageType; label: string; hint: string; required: boolean }[] = [
  { type: "EXTERIOR", label: "Salon outside", hint: "The front, with your board", required: true },
  { type: "INTERIOR", label: "Salon inside", hint: "Chairs and mirrors", required: true },
  { type: "PORTFOLIO", label: "Your work", hint: "A haircut you're proud of", required: true },
  { type: "RECEPTION", label: "Reception", hint: "Optional", required: false },
  { type: "STYLING_AREA", label: "Styling area", hint: "Optional", required: false },
  { type: "HAIRCUT", label: "Best haircut", hint: "Optional", required: false },
  { type: "HAIR_COLOUR", label: "Best hair colour", hint: "Optional", required: false },
  { type: "TEAM", label: "Your team", hint: "Optional", required: false },
];
const IMAGE_TYPES = new Set<string>(IMAGE_SLOTS.map((s) => s.type));
export const MIN_PHOTOS = 3;
export const MAX_STYLISTS = 20;

export const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED"] as const;
export const VERIFICATIONS = ["PENDING", "VERIFIED", "QUALITY_VERIFIED"] as const;
export type SalonStatus = (typeof STATUSES)[number];
export type Verification = (typeof VERIFICATIONS)[number];

export const SALON_EVENTS = [
  "salon_onboarding_started",
  "salon_step_1_completed",
  "salon_step_2_completed",
  "salon_step_3_completed",
  "salon_onboarding_completed",
  "salon_profile_viewed",
] as const;
export type SalonEvent = (typeof SALON_EVENTS)[number];

/** A salon as the onboarding form holds it (and as /api/salons/mine sends and takes it). */
export interface SalonForm {
  name: string;
  ownerManagerName: string;
  mobile: string;
  whatsapp: string;
  whatsappSame: boolean;
  email: string;
  instagram: string;
  city: string;
  area: string;
  address: string;
  mapsUrl: string;
  latitude: number | null;
  longitude: number | null;
  customerTypes: string[];
  marketTier: string;
  services: string[];
  specialities: string[];
  priceMen: string;
  priceWomen: string;
  priceUnisex: string;
  priceAdvanced: string;
  images: { type: ImageType; path: string }[];
  stylists: { name: string; photoPath: string | null; experienceYears: string; specialities: string[] }[];
  timings: string;
  amenities: string[];
  about: string;
}

export function emptySalonForm(): SalonForm {
  return {
    name: "",
    ownerManagerName: "",
    mobile: "",
    whatsapp: "",
    whatsappSame: true,
    email: "",
    instagram: "",
    city: "",
    area: "",
    address: "",
    mapsUrl: "",
    latitude: null,
    longitude: null,
    customerTypes: [],
    marketTier: "",
    services: [],
    specialities: [],
    priceMen: "",
    priceWomen: "",
    priceUnisex: "",
    priceAdvanced: "",
    images: [],
    stylists: [],
    timings: "",
    amenities: [],
    about: "",
  };
}

// ------------------------------------------------------------------ checks

export type Errors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "@my.salon", "instagram.com/my.salon/" → "my.salon"; null when it can't be a handle. */
export function cleanInstagram(raw: string): string | null {
  let h = raw.trim();
  if (!h) return "";
  h = h.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h : null;
}

/** A Google Maps link (any of the usual forms), or a link built from map coordinates. */
export function mapsUrlOk(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "maps.app.goo.gl" || host === "g.page" || host === "maps.google.com") return true;
    if (host === "goo.gl" && u.pathname.startsWith("/maps")) return true;
    if (/(^|\.)google\.[a-z.]+$/.test(host) && (u.pathname.startsWith("/maps") || u.searchParams.has("q"))) return true;
    return false;
  } catch {
    return false;
  }
}

/** A Google Maps link for a point, from "Locate my salon". */
export function mapsUrlFor(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** "350", "₹ 350", "" → 350 / null; NaN when it isn't a sensible price. */
export function parsePrice(raw: string): number | null {
  const t = raw.replace(/[₹,\s]/g, "");
  if (!t) return null;
  if (!/^\d{1,6}$/.test(t)) return NaN;
  const n = Number(t);
  return n <= 100000 ? n : NaN;
}

const req = (v: string, max: number) => v.trim().length > 0 && v.trim().length <= max;

export function checkStep1(f: SalonForm): Errors {
  const e: Errors = {};
  if (!req(f.name, 80)) e.name = "Please enter your salon's name.";
  if (!req(f.ownerManagerName, 80)) e.ownerManagerName = "Please enter the owner's or manager's name.";
  if (!cleanIndianMobile(f.mobile)) e.mobile = "Please enter a 10-digit Indian mobile number.";
  if (!f.whatsappSame && f.whatsapp.trim() && !cleanIndianMobile(f.whatsapp)) e.whatsapp = "Please enter a 10-digit WhatsApp number, or leave it empty.";
  if (f.email.trim() && (!EMAIL.test(f.email.trim()) || f.email.trim().length > 120)) e.email = "That email address doesn't look right.";
  if (f.instagram.trim() && cleanInstagram(f.instagram) === null) e.instagram = "Please enter just your Instagram name, like mysalon.";
  if (!req(f.city, 60)) e.city = "Please enter your city.";
  if (!req(f.area, 80)) e.area = "Please enter your area or locality.";
  if (!req(f.address, 300)) e.address = "Please enter the full address.";
  if (!f.mapsUrl.trim()) e.mapsUrl = "Please press “Locate my salon”, or paste your Google Maps link.";
  else if (!mapsUrlOk(f.mapsUrl) || f.mapsUrl.length > 500) e.mapsUrl = "That isn't a Google Maps link. Open your salon in Google Maps, press Share, and paste the link.";
  return e;
}

export function checkStep2(f: SalonForm): Errors {
  const e: Errors = {};
  const ids = (list: Choice[]) => new Set(list.map((c) => c.id));
  if (f.customerTypes.length === 0 || !f.customerTypes.every((c) => ids(CUSTOMER_TYPES).has(c))) e.customerTypes = "Please choose who you serve.";
  if (!MARKET_TIERS.some((t) => t.id === f.marketTier)) e.marketTier = "Please choose the type of salon.";
  if (f.services.length === 0 || !f.services.every((s) => ids(SERVICES).has(s))) e.services = "Please choose at least one service.";
  if (!f.specialities.every((s) => ids(SPECIALITIES).has(s))) e.specialities = "Please choose from the list.";
  for (const k of ["priceMen", "priceWomen", "priceUnisex", "priceAdvanced"] as const) {
    if (Number.isNaN(parsePrice(f[k]))) e[k] = "Please enter the price in rupees, numbers only.";
  }
  return e;
}

export function checkStep3(f: SalonForm, userId?: string): Errors {
  const e: Errors = {};
  for (const slot of IMAGE_SLOTS.filter((s) => s.required)) {
    if (!f.images.some((i) => i.type === slot.type)) e[`image_${slot.type}`] = `Please add a photo: ${slot.label.toLowerCase()}.`;
  }
  if (f.images.length < MIN_PHOTOS) e.images = `Please add at least ${MIN_PHOTOS} photos.`;
  if (f.images.length > 24) e.images = "That's too many photos — 24 at most.";
  if (!f.images.every((i) => IMAGE_TYPES.has(i.type) && storagePathOk(i.path, userId))) e.images = "One of the photos didn't upload properly. Please add it again.";
  return e;
}

export function checkStylists(f: SalonForm, userId?: string): Errors {
  const e: Errors = {};
  if (f.stylists.length > MAX_STYLISTS) e.stylists = `${MAX_STYLISTS} stylists at most.`;
  const spec = new Set(SPECIALITIES.map((c) => c.id));
  f.stylists.forEach((s, i) => {
    if (!req(s.name, 80)) e[`stylist_${i}`] = "Please enter the stylist's name, or remove this stylist.";
    else if (s.experienceYears.trim() && !/^\d{1,2}$/.test(s.experienceYears.trim())) e[`stylist_${i}`] = "Years of experience: a number, like 5.";
    else if (s.photoPath && !storagePathOk(s.photoPath, userId)) e[`stylist_${i}`] = "The stylist's photo didn't upload properly. Please add it again.";
    else if (!s.specialities.every((x) => spec.has(x))) e[`stylist_${i}`] = "Please choose specialities from the list.";
  });
  return e;
}

export function checkExtras(f: SalonForm): Errors {
  const e: Errors = {};
  if (f.timings.length > 300) e.timings = "Please keep the timings shorter.";
  if (f.about.length > 1000) e.about = "Please keep this under 1000 characters.";
  const am = new Set(AMENITIES.map((a) => a.id));
  if (!f.amenities.every((a) => am.has(a))) e.amenities = "Please choose from the list.";
  return e;
}

/** A file in the "salons" bucket, inside this owner's own folder. */
export function storagePathOk(path: string, userId?: string): boolean {
  if (!/^[0-9a-f-]{36}\/[A-Za-z0-9_-]{6,80}\.(jpg|jpeg|png|webp)$/.test(path)) return false;
  return userId ? path.startsWith(`${userId}/`) : true;
}

/** Every check, for the server before saving. */
export function checkAll(f: SalonForm, userId: string): Errors {
  return { ...checkStep1(f), ...checkStep2(f), ...checkStep3(f, userId), ...checkStylists(f, userId), ...checkExtras(f) };
}

/** A web address for the salon: "Looks Unisex Salon", "Sector 18" → "looks-unisex-salon-sector-18". */
export function salonSlug(name: string, area: string, suffix: string): string {
  const base = `${name} ${area}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
  return `${base || "salon"}-${suffix}`;
}

/** The labels for a list of ids, in the list's own order. */
export function labelsFor(list: Choice[], ids: string[]): string[] {
  const want = new Set(ids);
  return list.filter((c) => want.has(c.id)).map((c) => c.label);
}

/** The public web address of a photo in the "salons" bucket. */
export function salonPhotoUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/salons/${path}`;
}

/** The form's values as database columns (after checkAll passed). */
export function toSalonRow(f: SalonForm) {
  const mobile = cleanIndianMobile(f.mobile)!;
  const whatsapp = f.whatsappSame ? mobile : f.whatsapp.trim() ? cleanIndianMobile(f.whatsapp) : null;
  const price = (v: string) => {
    const n = parsePrice(v);
    return n === null || Number.isNaN(n) ? null : n;
  };
  return {
    name: f.name.trim(),
    owner_manager_name: f.ownerManagerName.trim(),
    mobile,
    whatsapp,
    email: f.email.trim() || null,
    instagram_handle: cleanInstagram(f.instagram) || null,
    city: f.city.trim(),
    area: f.area.trim(),
    address: f.address.trim(),
    maps_url: f.mapsUrl.trim(),
    latitude: typeof f.latitude === "number" && Number.isFinite(f.latitude) ? f.latitude : null,
    longitude: typeof f.longitude === "number" && Number.isFinite(f.longitude) ? f.longitude : null,
    customer_types: CUSTOMER_TYPES.map((c) => c.id).filter((id) => f.customerTypes.includes(id)),
    market_tier: f.marketTier,
    services: SERVICES.map((c) => c.id).filter((id) => f.services.includes(id)),
    specialities: SPECIALITIES.map((c) => c.id).filter((id) => f.specialities.includes(id)),
    price_men_rupees: price(f.priceMen),
    price_women_rupees: price(f.priceWomen),
    price_unisex_rupees: price(f.priceUnisex),
    price_advanced_rupees: price(f.priceAdvanced),
    timings: f.timings.trim() || null,
    amenities: AMENITIES.map((a) => a.id).filter((id) => f.amenities.includes(id)),
    about: f.about.trim() || null,
  };
}

/** A database row (with its photos and stylists) back into the form. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromSalonRow(row: any, images: any[], stylists: any[]): SalonForm {
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const n = (v: unknown) => (typeof v === "number" ? String(v) : "");
  const mobile = s(row.mobile).replace(/^\+91/, "");
  const whatsapp = s(row.whatsapp).replace(/^\+91/, "");
  return {
    name: s(row.name),
    ownerManagerName: s(row.owner_manager_name),
    mobile,
    whatsapp,
    whatsappSame: !whatsapp || whatsapp === mobile,
    email: s(row.email),
    instagram: s(row.instagram_handle),
    city: s(row.city),
    area: s(row.area),
    address: s(row.address),
    mapsUrl: s(row.maps_url),
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
    customerTypes: row.customer_types ?? [],
    marketTier: s(row.market_tier),
    services: row.services ?? [],
    specialities: row.specialities ?? [],
    priceMen: n(row.price_men_rupees),
    priceWomen: n(row.price_women_rupees),
    priceUnisex: n(row.price_unisex_rupees),
    priceAdvanced: n(row.price_advanced_rupees),
    images: images.map((i) => ({ type: i.image_type, path: i.storage_path })),
    stylists: stylists.map((t) => ({
      name: s(t.name),
      photoPath: t.photo_path ?? null,
      experienceYears: n(t.experience_years),
      specialities: t.specialities ?? [],
    })),
    timings: s(row.timings),
    amenities: row.amenities ?? [],
    about: s(row.about),
  };
}

/** The public view of a salon: no mobile/email unless it's for the owner. */
export interface PublicSalon {
  slug: string;
  name: string;
  city: string;
  area: string;
  address: string;
  mapsUrl: string;
  whatsapp: string | null;
  mobile: string | null;
  instagram: string | null;
  customerTypes: string[];
  marketTier: string;
  services: string[];
  specialities: string[];
  prices: { men: number | null; women: number | null; unisex: number | null; advanced: number | null };
  timings: string | null;
  amenities: string[];
  about: string | null;
  status: SalonStatus;
  verification: Verification;
  photos: { type: ImageType; url: string }[];
  stylists: { name: string; photoUrl: string | null; experienceYears: number | null; specialities: string[] }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toPublicSalon(row: any, images: any[], stylists: any[]): PublicSalon {
  return {
    slug: row.slug,
    name: row.name,
    city: row.city ?? "",
    area: row.area ?? "",
    address: row.address ?? "",
    mapsUrl: row.maps_url ?? "",
    // The salon gave these to be contacted by customers.
    whatsapp: row.whatsapp ?? null,
    mobile: row.mobile ?? null,
    instagram: row.instagram_handle ?? null,
    customerTypes: row.customer_types ?? [],
    marketTier: row.market_tier,
    services: row.services ?? [],
    specialities: row.specialities ?? [],
    prices: {
      men: row.price_men_rupees ?? null,
      women: row.price_women_rupees ?? null,
      unisex: row.price_unisex_rupees ?? null,
      advanced: row.price_advanced_rupees ?? null,
    },
    timings: row.timings ?? null,
    amenities: row.amenities ?? [],
    about: row.about ?? null,
    status: row.status,
    verification: row.verification_status,
    photos: images.map((i) => ({ type: i.image_type, url: salonPhotoUrl(i.storage_path) })),
    stylists: stylists.map((t) => ({
      name: t.name,
      photoUrl: t.photo_path ? salonPhotoUrl(t.photo_path) : null,
      experienceYears: t.experience_years ?? null,
      specialities: t.specialities ?? [],
    })),
  };
}

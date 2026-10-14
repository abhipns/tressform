// Tressform — hand-written TypeScript types mirroring db/schema.sql.
// Once a real Supabase project exists, these can be regenerated with
// `mcp__Supabase__generate_typescript_types` and this file can be replaced
// wholesale — the shape is kept intentionally close to the generator's output
// (Database → public → Tables → <table> → Row/Insert/Update) so that swap is
// a drop-in later.
//
// This file was missing from the project folder entirely (lib/supabaseClient.ts
// imports it, so nothing importing that module could build) — restored here,
// updated to match db/schema.sql as of the referral-credits rework and the
// carousel_sessions/carousel_photos + admin-upload additions (23.09.2026).

export type UserRole = "CUSTOMER" | "SALON" | "ADMIN";
export type PackTier = "STARTER" | "STYLE" | "COMPLETE" | "FULL_EXPLORE"; // COMPLETE kept only for historical orders, see db/schema.sql
export type AddonKind = "BACKGROUND" | "OUTFIT";
export type OrderStatus = "CREATED" | "PAID" | "FAILED" | "REFUNDED";
export type PayoutStatus = "PENDING" | "ELIGIBLE" | "PAID" | "INELIGIBLE"; // PAID means "credited," not "cashed out" — referral rewards are non-withdrawable credits
export type GenerationStatus = "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED";
export type MarketTier = "Standard" | "Premium" | "Luxury" | "Ultra Luxury";

export interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  free_previews_used: number;
  free_previews_limit: number;
  referral_code: string;
  referred_by: string | null;
  credit_balance_paise: number;
  first_purchase_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalonRow {
  id: string;
  owner_id: string;
  name: string;
  market_tier: MarketTier;
  city: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhotoRow {
  id: string;
  user_id: string;
  storage_path: string;
  face_shape: string | null;
  face_shape_confidence: number | null;
  rekognition_raw: Record<string, unknown> | null;
  /** What the customer confirmed on the result screen: whose styles, face shape, hair length, hair type. */
  customer_details: Record<string, unknown> | null;
  created_at: string;
}

export interface StyleResultRow {
  id: string;
  user_id: string;
  photo_id: string;
  order_id: string | null;
  style_name: string;
  addon_kind: AddonKind | null;
  status: GenerationStatus;
  result_storage_path: string | null;
  provider: string;
  cost_paise: number | null;
  error_message: string | null;
  /** The automatic check of the picture against the customer's photo (lib/previewCheck.ts). */
  check_result: Record<string, unknown> | null;
  view_paths: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export interface OrderRow {
  id: string;
  user_id: string;
  tier: PackTier | null;
  addon_kind: AddonKind | null;
  addon_photo_count: number;
  price_paise: number;
  gst_paise: number;
  generation_cost_paise: number;
  gateway_fee_paise: number;
  profit_before_referral_paise: number;
  is_referred_first_purchase: boolean;
  referral_credits_paise: number; // flat per-tier credit, see lib/pricing.ts REFERRAL_CREDITS_BY_TIER_PAISE — was referral_payout_paise (10% of profit) before 21.09.2026
  status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  /** How many hairstyle previews this order came with, and how many have been made from it. */
  preview_count: number;
  previews_used: number;
  /** 14.10.2026: Tressform credit put toward this order. price_paise is what was actually charged. */
  credit_used_paise: number;
  created_at: string;
  paid_at: string | null;
}

export interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code_used: string;
  first_purchase_order_id: string | null;
  first_purchase_qualified: boolean;
  payout_status: PayoutStatus;
  credits_paise: number;
  credits_tds_paise: number;
  paid_at: string | null;
  created_at: string;
}

export interface AffiliateProductRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  original_url: string | null;
  /** Before 13.10.2026: the one buy link (with `store`). Now optional; see shop_links. */
  earnkaro_tracked_url: string | null;
  category: string | null;
  price_paise: number | null;
  /** 12.10.2026, hair-care suggestions: */
  brand: string | null;
  kind: string | null;
  store: string | null;
  hair_types: string[];
  gender: "all" | "men" | "women";
  /** 13.10.2026: the Amazon product code; the link is built with the owner's tag. */
  amazon_asin: string | null;
  /** 13.10.2026: affiliate links for the other shops, e.g. { flipkart: "https://…", nykaa: "https://…" }. */
  shop_links: Record<string, string>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CarouselSessionRow {
  id: string;
  caption: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CarouselPhotoRow {
  id: string;
  session_id: string;
  src: string;
  tag: string;
  alt: string;
  sort_order: number;
}

export interface NotificationsLogRow {
  id: string;
  user_id: string | null;
  channel: "EMAIL" | "WHATSAPP";
  template: string;
  status: "QUEUED" | "SENT" | "FAILED";
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow> & { id: string }; Update: Partial<ProfileRow> };
      salons: { Row: SalonRow; Insert: Partial<SalonRow> & { owner_id: string; name: string }; Update: Partial<SalonRow> };
      photos: { Row: PhotoRow; Insert: Partial<PhotoRow> & { user_id: string; storage_path: string }; Update: Partial<PhotoRow> };
      style_results: {
        Row: StyleResultRow;
        Insert: Partial<StyleResultRow> & { user_id: string; photo_id: string; style_name: string };
        Update: Partial<StyleResultRow>;
      };
      orders: {
        Row: OrderRow;
        Insert: Partial<OrderRow> & {
          user_id: string;
          price_paise: number;
          gst_paise: number;
          generation_cost_paise: number;
          gateway_fee_paise: number;
          profit_before_referral_paise: number;
        };
        Update: Partial<OrderRow>;
      };
      referrals: {
        Row: ReferralRow;
        Insert: Partial<ReferralRow> & { referrer_id: string; referred_id: string; referral_code_used: string };
        Update: Partial<ReferralRow>;
      };
      affiliate_products: {
        Row: AffiliateProductRow;
        Insert: Partial<AffiliateProductRow> & { title: string };
        Update: Partial<AffiliateProductRow>;
      };
      carousel_sessions: {
        Row: CarouselSessionRow;
        Insert: Partial<CarouselSessionRow> & { caption: string };
        Update: Partial<CarouselSessionRow>;
      };
      carousel_photos: {
        Row: CarouselPhotoRow;
        Insert: Partial<CarouselPhotoRow> & { session_id: string; src: string };
        Update: Partial<CarouselPhotoRow>;
      };
      job_runs: {
        Row: { id: string; job: string; summary: Record<string, unknown> | null; ran_at: string };
        Insert: { job: string; summary?: Record<string, unknown> | null };
        Update: { job?: string; summary?: Record<string, unknown> | null };
      };
      notifications_log: {
        Row: NotificationsLogRow;
        Insert: Partial<NotificationsLogRow> & { channel: "EMAIL" | "WHATSAPP"; template: string };
        Update: Partial<NotificationsLogRow>;
      };
    };
  };
}

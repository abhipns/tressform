-- Tressform — Supabase database schema
-- Run in Supabase SQL editor, or via `supabase db push` / mcp__Supabase__apply_migration.
-- Mirrors the business rules in "Tressform — Final Build Spec v2" (Parts D, H, I, K, M).

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- Enums
-- ============================================================================
create type user_role as enum ('CUSTOMER', 'SALON', 'ADMIN');

create type pack_tier as enum ('STARTER', 'STYLE', 'COMPLETE', 'FULL_EXPLORE');
-- Updated per the Master Section Plan doc's pricing comment: COMPLETE is no
-- longer sold as its own tier as of this pass (its 10-photo count now lives
-- inside STYLE — 2 free-tier + 8 new). Kept in the enum only so historical
-- COMPLETE orders still resolve; new orders should never write COMPLETE.
-- Current pricing (see lib/pricing.ts, the actual source of truth — this
-- comment is documentation, not logic):
--   Starter Pack: ₹249 regular / ₹199 Early Bird (4 images)
--   Style Pack:   ₹499 regular / ₹399 Early Bird (10 images)
--   Full Explore: ₹999 Early Bird only, no regular price set yet (15 images,
--                 capped — "Coming Soon, locked" per Part D)
-- Early Bird cutoff: 31 Oct 2026, 23:59 IST — must be enforced by the
-- checkout/pricing engine, not just display copy (see lib/pricing.ts).

create type addon_kind as enum ('BACKGROUND', 'OUTFIT');
-- My Assets add-on, ₹25/photo (GST-inclusive), per Part H

create type order_status as enum ('CREATED', 'PAID', 'FAILED', 'REFUNDED');

create type payout_status as enum ('PENDING', 'ELIGIBLE', 'PAID', 'INELIGIBLE');
-- INELIGIBLE covers: not the referred customer's first purchase (Part I rule),
-- or any other disqualifying condition.

create type generation_status as enum ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- ============================================================================
-- profiles — extends auth.users (Supabase Auth) with app-specific fields
-- ============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'CUSTOMER',
  full_name text,
  phone text,
  email text,

  -- Free-preview allowance before a paid pack is required. Lifetime cap of 2
  -- per account (not per session) — see Part D "Rule change" note: this cap
  -- applies regardless of which paid tier is eventually purchased.
  free_previews_used integer not null default 0,
  free_previews_limit integer not null default 2,

  -- Referral: the code this user can share, and who referred them (if anyone)
  referral_code text unique not null default encode(gen_random_bytes(5), 'hex'),
  referred_by uuid references profiles (id) on delete set null,

  -- Redeemable Tressform credit balance (non-withdrawable, non-cash — see
  -- referrals.credits_paise / lib/pricing.ts REFERRAL_CREDITS_BY_TIER_PAISE).
  -- Spendable only at partner salons or on more generations on the site/app;
  -- the actual redemption flow (checkout deduction, salon-side redemption)
  -- isn't built yet — this column just tracks the balance credits accrue
  -- into so it exists once that flow is.
  credit_balance_paise integer not null default 0,

  -- Set the first time this user's FIRST paid order settles (PAID). Used to
  -- gate referral payout eligibility ("first purchase only" — Part I).
  first_purchase_order_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_referred_by on profiles (referred_by);
create index if not exists idx_profiles_role on profiles (role);

-- ============================================================================
-- salons — Phase-2 per spec Part M, scaffolded now per "build everything at
-- once" decision. One salon per owning profile (role = SALON).
-- ============================================================================
create table if not exists salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  market_tier text not null default 'Standard'
    check (market_tier in ('Standard', 'Premium', 'Luxury', 'Ultra Luxury')),
  city text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_salons_owner on salons (owner_id);

-- ============================================================================
-- photos — user-uploaded source photos + AWS Rekognition face-shape result
-- ============================================================================
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  storage_path text not null, -- Supabase Storage object path
  face_shape text, -- classifier output, e.g. 'Oval' | 'Round' | 'Square' | 'Heart' | 'Diamond' | 'Long'
  face_shape_confidence numeric(5, 2),
  rekognition_raw jsonb, -- raw provider response, for audit/retraining
  created_at timestamptz not null default now()
);

create index if not exists idx_photos_user on photos (user_id);

-- ============================================================================
-- style_results — generated hairstyle previews (FAL AI / PuLID Flux output)
-- ============================================================================
create table if not exists style_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  photo_id uuid not null references photos (id) on delete cascade,
  order_id uuid, -- null while still within free-preview allowance
  style_name text not null,
  addon_kind addon_kind, -- set when this result used a My Assets add-on
  status generation_status not null default 'QUEUED',
  result_storage_path text,
  provider text not null default 'fal_ai_pulid_flux',
  cost_paise integer, -- actual provider cost incurred, in paise, for margin auditing
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_style_results_user on style_results (user_id);
create index if not exists idx_style_results_order on style_results (order_id);

-- ============================================================================
-- orders — one row per checkout (pack purchase or My Assets add-on)
-- ============================================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,

  tier pack_tier, -- null when this order is an add-on-only purchase
  addon_kind addon_kind,
  addon_photo_count integer not null default 0,

  -- Pricing snapshot at time of purchase (all amounts in paise, GST-inclusive)
  price_paise integer not null,
  gst_paise integer not null, -- price * 18/118, per Part I methodology
  generation_cost_paise integer not null, -- image count * ₹3.50 * 1.2 buffer
  gateway_fee_paise integer not null, -- ~2.36% of price
  profit_before_referral_paise integer not null,

  is_referred_first_purchase boolean not null default false,
  -- Flat non-cash credit, keyed by tier (see REFERRAL_CREDITS_BY_TIER_PAISE
  -- in lib/pricing.ts) — 0 for add-on-only orders even when first purchase.
  -- Resolved 21.09.2026, doc thread ef02f07b: replaces the earlier "10% of
  -- profit" cash-payout rule.
  referral_credits_paise integer not null default 0,

  status order_status not null default 'CREATED',

  -- Razorpay
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,

  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_orders_user on orders (user_id);
create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_razorpay_order on orders (razorpay_order_id);

-- ============================================================================
-- referrals — one row per (referrer, referred customer) relationship, plus
-- credit tracking. A profile can be referred at most once (see unique
-- index). Resolved 21.09.2026 (doc thread ef02f07b): rewards are a flat,
-- non-cash, non-withdrawable Tressform credit keyed by which tier the
-- referred customer's first purchase was — not a percentage of profit, and
-- not paid at all when that first purchase is an add-on-only order.
-- `payout_status`/`paid_at` are kept (renamed in spirit, not in type, to
-- avoid an enum migration here) to mean "credited to the referrer's
-- balance", not "cash paid out" — see profiles.credit_balance_paise below.
-- ============================================================================
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles (id) on delete cascade,
  referred_id uuid not null references profiles (id) on delete cascade,
  referral_code_used text not null,

  -- Set once the referred user's first order (any tier) settles as PAID.
  first_purchase_order_id uuid references orders (id) on delete set null,

  -- True only when first_purchase_order_id's order included a tier pack
  -- (Starter/Style/Full Explore) — an add-on-only first purchase leaves
  -- this false and credits_paise at 0, permanently (never re-evaluated on
  -- a later purchase).
  first_purchase_qualified boolean not null default false,

  payout_status payout_status not null default 'PENDING', -- PAID here means "credited," not "cashed out" — credits are non-withdrawable
  -- Flat per-tier amount (REFERRAL_CREDITS_BY_TIER_PAISE in lib/pricing.ts),
  -- already reduced by the ₹15,000/FY-per-referrer cap if it applied — see
  -- calculateReferralCreditsPaiseWithCap, resolved 21.09.2026 (doc thread
  -- d7f981de). Can be 0 even for a qualifying tier purchase if the referrer
  -- had already hit the cap for the financial year.
  credits_paise integer not null default 0,
  credits_tds_paise integer not null default 0, -- 2% TDS under Sec 393, IF it turns out to apply to non-cash credits — see the flag on calculateReferralTds in lib/pricing.ts, not yet confirmed; the ₹15,000 cap sits below the ₹20,000 TDS threshold specifically so this shouldn't trigger under normal use
  paid_at timestamptz, -- when credited to the referrer's balance

  created_at timestamptz not null default now(),

  constraint referrals_no_self_referral check (referrer_id <> referred_id),
  constraint referrals_one_referral_per_customer unique (referred_id)
);

create index if not exists idx_referrals_referrer on referrals (referrer_id);
-- Supports summing a referrer's credits within a financial year to enforce
-- the ₹15,000/FY cap (see lib/pricing.ts financialYearStart / mockStore.ts
-- sumReferrerCreditsThisFY — the real-Supabase equivalent query is
-- `select coalesce(sum(credits_paise),0) from referrals where referrer_id = $1
--  and created_at >= $2` using that same FY-start date).
create index if not exists idx_referrals_referrer_created on referrals (referrer_id, created_at);

-- ============================================================================
-- affiliate_products — manually-curated "Maintain Your Look" catalog
-- (EarnKaro links converted one product at a time — no live feed, Part J)
-- ============================================================================
create table if not exists affiliate_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  original_url text not null,
  earnkaro_tracked_url text not null,
  category text,
  price_paise integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_affiliate_products_active on affiliate_products (is_active, sort_order);

-- ============================================================================
-- carousel_sessions / carousel_photos — homepage marquee content (Row 7,
-- "Real Portraits"), added per doc thread f3588221-19c8 so photos can be
-- added through an admin upload screen (app/admin/carousel + app/api/admin/
-- carousel) instead of editing lib/content/carousel.ts and redeploying.
-- Mirrors that file's shape 1:1 — one session = one carousel card.
-- ============================================================================
create table if not exists carousel_sessions (
  id uuid primary key default gen_random_uuid(),
  caption text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists carousel_photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references carousel_sessions (id) on delete cascade,
  -- Public URL in Supabase Storage (bucket: "carousel"), or any hosted URL.
  src text not null,
  tag text not null default 'AI',
  alt text not null default '',
  sort_order integer not null default 0
);

create index if not exists idx_carousel_photos_session on carousel_photos (session_id, sort_order);
create index if not exists idx_carousel_sessions_active on carousel_sessions (is_active, sort_order);

-- ============================================================================
-- notifications_log — MSG91 email/WhatsApp send audit trail (Trivia/blog)
-- ============================================================================
create table if not exists notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  channel text not null check (channel in ('EMAIL', 'WHATSAPP')),
  template text not null,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'SENT', 'FAILED')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_log_user on notifications_log (user_id);

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_salons_updated_at on salons;
create trigger trg_salons_updated_at before update on salons
  for each row execute function set_updated_at();

drop trigger if exists trg_affiliate_products_updated_at on affiliate_products;
create trigger trg_affiliate_products_updated_at before update on affiliate_products
  for each row execute function set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table salons enable row level security;
alter table photos enable row level security;
alter table style_results enable row level security;
alter table orders enable row level security;
alter table referrals enable row level security;
alter table affiliate_products enable row level security;
alter table notifications_log enable row level security;
alter table carousel_sessions enable row level security;
alter table carousel_photos enable row level security;

-- profiles: a user can read/update only their own row; service role bypasses RLS
create policy profiles_select_own on profiles for select using (auth.uid() = id);
create policy profiles_update_own on profiles for update using (auth.uid() = id);

-- salons: owner can manage their own salon; anyone can read active salons
create policy salons_select_active on salons for select using (is_active = true or owner_id = auth.uid());
create policy salons_manage_own on salons for all using (owner_id = auth.uid());

-- photos / style_results / orders: strictly owner-scoped
create policy photos_owner_all on photos for all using (user_id = auth.uid());
create policy style_results_owner_all on style_results for all using (user_id = auth.uid());
create policy orders_owner_select on orders for select using (user_id = auth.uid());

-- referrals: a user can see rows where they are either party
create policy referrals_party_select on referrals for select
  using (referrer_id = auth.uid() or referred_id = auth.uid());

-- affiliate_products: public read of active products
create policy affiliate_products_public_select on affiliate_products for select using (is_active = true);

-- notifications_log: owner-only read
create policy notifications_log_owner_select on notifications_log for select using (user_id = auth.uid());

-- carousel_sessions / carousel_photos: public read of active sessions;
-- writes only via the service-role client from app/api/admin/carousel
-- (no anon insert/update/delete policy — RLS default-denies those).
create policy carousel_sessions_public_select on carousel_sessions for select using (is_active = true);
create policy carousel_photos_public_select on carousel_photos for select using (
  exists (select 1 from carousel_sessions cs where cs.id = session_id and cs.is_active = true)
);

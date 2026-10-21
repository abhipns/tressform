-- =====================================================================
-- Tressform — full database structure (Supabase project xnxrzyqznelexjddzbtw)
-- Exported from the live database on 14.10.2026. Structure only, no data.
--
-- What this is for: if the Supabase project is ever lost or a fresh one is
-- needed (e.g. a staging copy), run this whole file once in a NEW, empty
-- Supabase project (Dashboard -> SQL Editor -> paste -> Run). It recreates
-- every table, rule, function, trigger, storage bucket and access policy
-- the site's code depends on. Then make yourself the owner with:
--   update public.profiles set role = 'ADMIN' where email = '<your email>';
--
-- Do NOT run it on the live project — the objects already exist there and
-- it will stop at the first "already exists" error (nothing is deleted).
--
-- Keep it current: whenever a table/column/function is added or changed in
-- Supabase, ask Claude to re-export this file and upload the new version.
--
-- Notes:
--  * Supabase's own default table grants to anon/authenticated are assumed;
--    row level security (section 9) is what actually limits access. Tables
--    with security on but no policy (reviews, site_visits, affiliate_income,
--    affiliate_clicks, job_runs) are reachable only by the server.
--  * Every function except set_updated_at() is server-only (section 7).
--  * Updated 14.10.2026: credit at checkout (orders.credit_used_paise,
--    spend_credit) and the profiles column permissions. Individual changes
--    are also kept in supabase/migrations/.
-- =====================================================================

-- 1. Extensions (Supabase usually has these already) ------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- 2. Enum types --------------------------------------------------------
create type public.addon_kind as enum ('BACKGROUND', 'OUTFIT');
create type public.generation_status as enum ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED');
create type public.order_status as enum ('CREATED', 'PAID', 'FAILED', 'REFUNDED');
create type public.pack_tier as enum ('STARTER', 'STYLE', 'COMPLETE', 'FULL_EXPLORE');
create type public.payout_status as enum ('PENDING', 'ELIGIBLE', 'PAID', 'INELIGIBLE');
create type public.user_role as enum ('CUSTOMER', 'SALON', 'ADMIN');

create sequence if not exists public.site_visits_id_seq;

-- 3. Tables ------------------------------------------------------------
create table public.profiles (
  id uuid not null,
  role user_role default 'CUSTOMER'::user_role not null,
  full_name text,
  phone text,
  email text,
  free_previews_used integer default 0 not null,
  free_previews_limit integer default 2 not null,
  referral_code text default encode(gen_random_bytes(5), 'hex'::text) not null,
  referred_by uuid,
  credit_balance_paise integer default 0 not null,
  first_purchase_order_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  approx_city text,
  approx_region text,
  approx_country text,
  approx_location_at timestamp with time zone
);

create table public.orders (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  tier pack_tier,
  addon_kind addon_kind,
  addon_photo_count integer default 0 not null,
  price_paise integer not null,
  gst_paise integer not null,
  generation_cost_paise integer not null,
  gateway_fee_paise integer not null,
  profit_before_referral_paise integer not null,
  is_referred_first_purchase boolean default false not null,
  referral_credits_paise integer default 0 not null,
  status order_status default 'CREATED'::order_status not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  created_at timestamp with time zone default now() not null,
  paid_at timestamp with time zone,
  preview_count integer default 0 not null,
  previews_used integer default 0 not null,
  credit_used_paise integer default 0 not null
);

create table public.photos (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  storage_path text not null,
  face_shape text,
  face_shape_confidence numeric(5,2),
  rekognition_raw jsonb,
  created_at timestamp with time zone default now() not null,
  customer_details jsonb
);

create table public.style_results (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  photo_id uuid not null,
  order_id uuid,
  style_name text not null,
  addon_kind addon_kind,
  status generation_status default 'QUEUED'::generation_status not null,
  result_storage_path text,
  provider text default 'fal_ai_pulid_flux'::text not null,
  cost_paise integer,
  error_message text,
  created_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  check_result jsonb,
  view_paths jsonb
);

create table public.referrals (
  id uuid default gen_random_uuid() not null,
  referrer_id uuid not null,
  referred_id uuid not null,
  referral_code_used text not null,
  first_purchase_order_id uuid,
  first_purchase_qualified boolean default false not null,
  payout_status payout_status default 'PENDING'::payout_status not null,
  credits_paise integer default 0 not null,
  credits_tds_paise integer default 0 not null,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table public.reviews (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  section text not null,
  rating smallint not null,
  comment text,
  display_name text,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.affiliate_products (
  id uuid default gen_random_uuid() not null,
  title text not null,
  description text,
  image_url text,
  original_url text,
  earnkaro_tracked_url text,
  category text,
  price_paise integer,
  is_active boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  brand text,
  kind text,
  store text,
  hair_types text[] default '{}'::text[] not null,
  gender text default 'all'::text not null,
  amazon_asin text,
  shop_links jsonb default '{}'::jsonb not null
);

create table public.affiliate_clicks (
  id uuid default gen_random_uuid() not null,
  product_id uuid not null,
  style_id text,
  placement text,
  user_id uuid,
  created_at timestamp with time zone default now() not null,
  shop text
);

create table public.affiliate_income (
  id uuid default gen_random_uuid() not null,
  month date not null,
  source text not null,
  amount_paise integer not null,
  note text,
  created_at timestamp with time zone default now() not null
);

create table public.carousel_sessions (
  id uuid default gen_random_uuid() not null,
  caption text not null,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table public.carousel_photos (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  src text not null,
  tag text default 'AI'::text not null,
  alt text default ''::text not null,
  sort_order integer default 0 not null
);

create table public.salons (
  id uuid default gen_random_uuid() not null,
  owner_id uuid not null,
  name text not null,
  market_tier text default 'Standard'::text not null,
  city text,
  address text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.notifications_log (
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  channel text not null,
  template text not null,
  status text default 'QUEUED'::text not null,
  provider_message_id text,
  error_message text,
  created_at timestamp with time zone default now() not null
);

create table public.job_runs (
  id uuid default gen_random_uuid() not null,
  job text not null,
  summary jsonb,
  ran_at timestamp with time zone default now() not null
);

create table public.site_visits (
  id bigint default nextval('public.site_visits_id_seq'::regclass) not null,
  visitor text not null,
  path text default '/'::text not null,
  referrer_host text,
  user_id uuid,
  created_at timestamp with time zone default now() not null
);
alter sequence public.site_visits_id_seq owned by public.site_visits.id;

-- 4. Keys and rules (primary keys, unique, checks) ---------------------
alter table public.affiliate_clicks add constraint affiliate_clicks_pkey PRIMARY KEY (id);
alter table public.affiliate_income add constraint affiliate_income_pkey PRIMARY KEY (id);
alter table public.affiliate_income add constraint affiliate_income_month_source_key UNIQUE (month, source);
alter table public.affiliate_income add constraint affiliate_income_amount_paise_check CHECK ((amount_paise >= 0));
alter table public.affiliate_income add constraint affiliate_income_note_check CHECK ((char_length(note) <= 200));
alter table public.affiliate_income add constraint affiliate_income_source_check CHECK ((source = ANY (ARRAY['amazon'::text, 'earnkaro'::text, 'other'::text])));
alter table public.affiliate_products add constraint affiliate_products_pkey PRIMARY KEY (id);
alter table public.affiliate_products add constraint affiliate_products_asin_chk CHECK (((amazon_asin IS NULL) OR (amazon_asin ~ '^[A-Z0-9]{10}$'::text)));
alter table public.affiliate_products add constraint affiliate_products_gender_chk CHECK ((gender = ANY (ARRAY['all'::text, 'men'::text, 'women'::text])));
alter table public.affiliate_products add constraint affiliate_products_hair_types_chk CHECK ((hair_types <@ ARRAY['straight'::text, 'wavy'::text, 'curly'::text]));
alter table public.affiliate_products add constraint affiliate_products_link_chk CHECK ((earnkaro_tracked_url ~* '^https://'::text));
alter table public.carousel_photos add constraint carousel_photos_pkey PRIMARY KEY (id);
alter table public.carousel_sessions add constraint carousel_sessions_pkey PRIMARY KEY (id);
alter table public.job_runs add constraint job_runs_pkey PRIMARY KEY (id);
alter table public.notifications_log add constraint notifications_log_pkey PRIMARY KEY (id);
alter table public.notifications_log add constraint notifications_log_channel_check CHECK ((channel = ANY (ARRAY['EMAIL'::text, 'WHATSAPP'::text])));
alter table public.notifications_log add constraint notifications_log_status_check CHECK ((status = ANY (ARRAY['QUEUED'::text, 'SENT'::text, 'FAILED'::text])));
alter table public.orders add constraint orders_pkey PRIMARY KEY (id);
alter table public.orders add constraint orders_credit_used_paise_check CHECK ((credit_used_paise >= 0));
alter table public.photos add constraint photos_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_referral_code_key UNIQUE (referral_code);
alter table public.referrals add constraint referrals_pkey PRIMARY KEY (id);
alter table public.referrals add constraint referrals_one_referral_per_customer UNIQUE (referred_id);
alter table public.referrals add constraint referrals_no_self_referral CHECK ((referrer_id <> referred_id));
alter table public.reviews add constraint reviews_pkey PRIMARY KEY (id);
alter table public.reviews add constraint reviews_user_id_section_key UNIQUE (user_id, section);
alter table public.reviews add constraint reviews_comment_check CHECK ((char_length(comment) <= 600));
alter table public.reviews add constraint reviews_display_name_check CHECK ((char_length(display_name) <= 40));
alter table public.reviews add constraint reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
alter table public.reviews add constraint reviews_section_check CHECK ((section = ANY (ARRAY['list'::text, 'hairstyles'::text])));
alter table public.reviews add constraint reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'hidden'::text])));
alter table public.salons add constraint salons_pkey PRIMARY KEY (id);
alter table public.salons add constraint salons_market_tier_check CHECK ((market_tier = ANY (ARRAY['Standard'::text, 'Premium'::text, 'Luxury'::text, 'Ultra Luxury'::text])));
alter table public.site_visits add constraint site_visits_pkey PRIMARY KEY (id);
alter table public.site_visits add constraint site_visits_path_check CHECK ((char_length(path) <= 200));
alter table public.site_visits add constraint site_visits_referrer_host_check CHECK ((char_length(referrer_host) <= 120));
alter table public.site_visits add constraint site_visits_visitor_check CHECK (((char_length(visitor) >= 8) AND (char_length(visitor) <= 64)));
alter table public.style_results add constraint style_results_pkey PRIMARY KEY (id);

-- 5. Links between tables (foreign keys) -------------------------------
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
alter table public.orders add constraint orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.photos add constraint photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.style_results add constraint style_results_photo_id_fkey FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE CASCADE;
alter table public.style_results add constraint style_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.referrals add constraint referrals_first_purchase_order_id_fkey FOREIGN KEY (first_purchase_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
alter table public.referrals add constraint referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.referrals add constraint referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.reviews add constraint reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.affiliate_clicks add constraint affiliate_clicks_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.affiliate_products(id) ON DELETE CASCADE;
alter table public.affiliate_clicks add constraint affiliate_clicks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.carousel_photos add constraint carousel_photos_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.carousel_sessions(id) ON DELETE CASCADE;
alter table public.salons add constraint salons_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
alter table public.notifications_log add constraint notifications_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Indexes -----------------------------------------------------------
CREATE INDEX affiliate_clicks_product_idx ON public.affiliate_clicks USING btree (product_id, created_at DESC);
CREATE INDEX affiliate_products_kind_idx ON public.affiliate_products USING btree (kind) WHERE is_active;
CREATE INDEX idx_affiliate_products_active ON public.affiliate_products USING btree (is_active, sort_order);
CREATE INDEX idx_carousel_photos_session ON public.carousel_photos USING btree (session_id, sort_order);
CREATE INDEX idx_carousel_sessions_active ON public.carousel_sessions USING btree (is_active, sort_order);
CREATE INDEX idx_job_runs_job_time ON public.job_runs USING btree (job, ran_at DESC);
CREATE INDEX idx_notifications_log_user ON public.notifications_log USING btree (user_id);
CREATE INDEX idx_orders_razorpay_order ON public.orders USING btree (razorpay_order_id);
CREATE INDEX idx_orders_status ON public.orders USING btree (status);
CREATE INDEX idx_orders_user ON public.orders USING btree (user_id);
CREATE INDEX idx_photos_user ON public.photos USING btree (user_id);
CREATE INDEX idx_profiles_referred_by ON public.profiles USING btree (referred_by);
CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_id);
CREATE INDEX idx_referrals_referrer_created ON public.referrals USING btree (referrer_id, created_at);
CREATE INDEX idx_salons_owner ON public.salons USING btree (owner_id);
CREATE INDEX idx_style_results_order ON public.style_results USING btree (order_id);
CREATE INDEX idx_style_results_photo ON public.style_results USING btree (photo_id);
CREATE INDEX idx_style_results_user ON public.style_results USING btree (user_id);
CREATE INDEX site_visits_created_idx ON public.site_visits USING btree (created_at);

-- 7. Functions ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.increment_credit_balance(profile_id uuid, amount_paise integer)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  update public.profiles
     set credit_balance_paise = credit_balance_paise + amount_paise
   where id = profile_id;
$function$;

CREATE OR REPLACE FUNCTION public.reserve_free_preview(profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with taken as (
    update public.profiles
       set free_previews_used = free_previews_used + 1
     where id = profile_id
       and free_previews_used < free_previews_limit
    returning 1
  )
  select exists (select 1 from taken);
$function$;

CREATE OR REPLACE FUNCTION public.release_free_preview(profile_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  update public.profiles
     set free_previews_used = greatest(free_previews_used - 1, 0)
   where id = profile_id;
$function$;

CREATE OR REPLACE FUNCTION public.reserve_paid_preview(p_user uuid)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with pick as (
    select o.id
      from public.orders o
     where o.user_id = p_user
       and o.status = 'PAID'
       and o.previews_used < o.preview_count
     order by o.paid_at nulls last, o.created_at
     limit 1
       for update
  ), taken as (
    update public.orders o
       set previews_used = o.previews_used + 1
      from pick
     where o.id = pick.id
       and o.previews_used < o.preview_count
    returning o.id
  )
  select id from taken;
$function$;

CREATE OR REPLACE FUNCTION public.release_paid_preview(p_order uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  update public.orders
     set previews_used = greatest(previews_used - 1, 0)
   where id = p_order;
$function$;

CREATE OR REPLACE FUNCTION public.spend_credit(p_user uuid, p_amount integer)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with taken as (
    update public.profiles
       set credit_balance_paise = credit_balance_paise - p_amount
     where id = p_user
       and p_amount > 0
       and credit_balance_paise >= p_amount
    returning 1
  )
  select exists (select 1 from taken);
$function$;

CREATE OR REPLACE FUNCTION public.account_last_seen()
 RETURNS TABLE(user_id uuid, seen timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select u.id,
         greatest(
           u.created_at,
           u.last_sign_in_at,
           (select max(greatest(s.created_at, s.updated_at)) from auth.sessions s where s.user_id = u.id),
           (select max(p.created_at) from public.photos p where p.user_id = u.id),
           (select max(r.created_at) from public.style_results r where r.user_id = u.id),
           (select max(o.created_at) from public.orders o where o.user_id = u.id)
         )
    from auth.users u;
$function$;

CREATE OR REPLACE FUNCTION public.expired_storage_objects(max_age_days integer DEFAULT 90, max_rows integer DEFAULT 500)
 RETURNS TABLE(bucket_id text, name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select o.bucket_id, o.name
    from storage.objects o
    left join public.account_last_seen() l on l.user_id::text = split_part(o.name, '/', 1)
   where o.bucket_id in ('photos', 'results')
     and o.created_at < now() - make_interval(days => greatest(max_age_days, 30))
     and (l.user_id is null or l.seen < now() - make_interval(days => greatest(max_age_days, 30)))
     and not exists (
           select 1
             from public.style_results r
            where o.bucket_id = 'results'
              and r.result_storage_path = o.name
              and r.order_id is not null
         )
   order by o.created_at
   limit greatest(max_rows, 0);
$function$;

CREATE OR REPLACE FUNCTION public.purge_expired_photo_records(max_age_days integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(max_age_days, 30));
  previews integer := 0;
  photos integer := 0;
begin
  -- Free previews of unused accounts whose image file no longer exists.
  with gone as (
    delete from public.style_results r
     using public.account_last_seen() l
     where l.user_id = r.user_id
       and l.seen < cutoff
       and r.created_at < cutoff
       and r.order_id is null
       and not exists (
             select 1 from storage.objects o
              where o.bucket_id = 'results' and o.name = r.result_storage_path
           )
    returning 1
  )
  select count(*) into previews from gone;

  -- Photo records (with their face measurements) of unused accounts whose
  -- photo file no longer exists. A photo that still has a result attached —
  -- which by now can only be a paid one — is kept.
  with gone as (
    delete from public.photos p
     using public.account_last_seen() l
     where l.user_id = p.user_id
       and l.seen < cutoff
       and p.created_at < cutoff
       and not exists (
             select 1 from storage.objects o
              where o.bucket_id = 'photos' and o.name = p.storage_path
           )
       and not exists (select 1 from public.style_results r where r.photo_id = p.id)
    returning 1
  )
  select count(*) into photos from gone;

  -- A photo record that had to stay (a paid result hangs off it) still
  -- loses its face measurements once its file is gone.
  update public.photos p
     set rekognition_raw = null
    from public.account_last_seen() l
   where l.user_id = p.user_id
     and l.seen < cutoff
     and p.created_at < cutoff
     and p.rekognition_raw is not null
     and not exists (
           select 1 from storage.objects o
            where o.bucket_id = 'photos' and o.name = p.storage_path
         );

  return previews + photos;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_stats(p_since timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with admins as (select id from profiles where role = 'ADMIN'),
paid as (
  select o.* from orders o
  where o.status = 'PAID' and o.paid_at >= p_since and o.user_id not in (select id from admins)
),
paid_all as (
  select user_id, count(*) n from orders
  where status = 'PAID' and user_id not in (select id from admins)
  group by user_id
),
clk as (
  select c.product_id, coalesce(c.shop, 'unknown') shop from affiliate_clicks c
  where c.created_at >= p_since and coalesce(c.placement, '') <> 'test'
    and (c.user_id is null or c.user_id not in (select id from admins))
),
per_shop as (select product_id, shop, count(*) n from clk group by 1, 2),
per_product as (
  select ps.product_id, sum(ps.n) clicks, jsonb_object_agg(ps.shop, ps.n) by_shop
  from per_shop ps group by ps.product_id
)
select jsonb_build_object(
  'visitors', (select count(distinct visitor) from site_visits where created_at >= p_since),
  'page_views', (select count(*) from site_visits where created_at >= p_since),
  'returning_visitors', (select count(*) from (
      select visitor from site_visits where created_at >= p_since
      group by visitor having count(distinct (created_at at time zone 'Asia/Kolkata')::date) > 1) r),
  'signups', (select count(*) from profiles where created_at >= p_since and role <> 'ADMIN'),
  'selfies', (select count(*) from photos where created_at >= p_since and user_id not in (select id from admins)),
  'selfie_people', (select count(distinct user_id) from photos where created_at >= p_since and user_id not in (select id from admins)),
  'hairstyles_made', (select count(*) from style_results where created_at >= p_since and status = 'SUCCEEDED'
      and style_name not like 'Studio:%' and user_id not in (select id from admins)),
  'orders', (select count(*) from paid),
  'buyers', (select count(distinct user_id) from paid),
  'repeat_buyers', (select count(*) from paid_all where n >= 2 and user_id in (select user_id from paid)),
  'revenue_paise', (select coalesce(sum(price_paise), 0) from paid),
  'credit_used_paise', (select coalesce(sum(credit_used_paise), 0) from paid),
  'fees_paise', (select coalesce(sum(gateway_fee_paise), 0) from paid),
  'ai_cost_paise', (select coalesce(sum(cost_paise), 0) from style_results
      where created_at >= p_since and user_id not in (select id from admins)),
  'by_pack', (select coalesce(jsonb_object_agg(tier, n), '{}'::jsonb) from (select tier::text, count(*) n from paid group by tier) t),
  'product_clicks', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'brand', p.brand,
        'clicks', pp.clicks, 'by_shop', pp.by_shop) order by pp.clicks desc), '[]'::jsonb)
      from per_product pp join affiliate_products p on p.id = pp.product_id),
  'shop_clicks', (select coalesce(jsonb_object_agg(shop, n), '{}'::jsonb) from (select shop, count(*) n from clk group by 1) s),
  'ratings', (select coalesce(jsonb_object_agg(section, jsonb_build_object('avg', round(av, 2), 'count', n, 'pending', pend)), '{}'::jsonb) from (
      select section, avg(rating) av, count(*) n, count(*) filter (where status = 'pending') pend
      from reviews where status <> 'hidden' group by section) r),
  'affiliate_income_paise', (select coalesce(sum(amount_paise), 0) from affiliate_income
      where month >= date_trunc('month', p_since)::date)
);
$function$;

-- Who may run the functions: server only, except the updated_at helper.
revoke all on function public.account_last_seen() from public, anon, authenticated;
grant execute on function public.account_last_seen() to service_role;
revoke all on function public.admin_stats(timestamp with time zone) from public, anon, authenticated;
grant execute on function public.admin_stats(timestamp with time zone) to service_role;
revoke all on function public.expired_storage_objects(integer, integer) from public, anon, authenticated;
grant execute on function public.expired_storage_objects(integer, integer) to service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
revoke all on function public.increment_credit_balance(uuid, integer) from public, anon, authenticated;
grant execute on function public.increment_credit_balance(uuid, integer) to service_role;
revoke all on function public.purge_expired_photo_records(integer) from public, anon, authenticated;
grant execute on function public.purge_expired_photo_records(integer) to service_role;
revoke all on function public.release_free_preview(uuid) from public, anon, authenticated;
grant execute on function public.release_free_preview(uuid) to service_role;
revoke all on function public.release_paid_preview(uuid) from public, anon, authenticated;
grant execute on function public.release_paid_preview(uuid) to service_role;
revoke all on function public.reserve_free_preview(uuid) from public, anon, authenticated;
grant execute on function public.reserve_free_preview(uuid) to service_role;
revoke all on function public.reserve_paid_preview(uuid) from public, anon, authenticated;
grant execute on function public.reserve_paid_preview(uuid) to service_role;
revoke all on function public.spend_credit(uuid, integer) from public, anon, authenticated;
grant execute on function public.spend_credit(uuid, integer) to service_role;
revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to anon, authenticated, service_role;

-- 8. Triggers ----------------------------------------------------------
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_affiliate_products_updated_at BEFORE UPDATE ON public.affiliate_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_salons_updated_at BEFORE UPDATE ON public.salons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Signed-in customers may change only their own name and phone in profiles —
-- never their role, credit balance or referral fields. (Every other table
-- keeps Supabase's standard grants; row level security below limits them.)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- 9. Row level security and policies ------------------------------------
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_income enable row level security;
alter table public.affiliate_products enable row level security;
alter table public.carousel_photos enable row level security;
alter table public.carousel_sessions enable row level security;
alter table public.job_runs enable row level security;
alter table public.notifications_log enable row level security;
alter table public.orders enable row level security;
alter table public.photos enable row level security;
alter table public.profiles enable row level security;
alter table public.referrals enable row level security;
alter table public.reviews enable row level security;
alter table public.salons enable row level security;
alter table public.site_visits enable row level security;
alter table public.style_results enable row level security;

create policy affiliate_products_public_select on public.affiliate_products as permissive for select to public
  using ((is_active = true));
create policy carousel_sessions_public_select on public.carousel_sessions as permissive for select to public
  using ((is_active = true));
create policy carousel_photos_public_select on public.carousel_photos as permissive for select to public
  using ((EXISTS ( SELECT 1 FROM public.carousel_sessions cs
    WHERE ((cs.id = carousel_photos.session_id) AND (cs.is_active = true)))));
create policy notifications_log_owner_select on public.notifications_log as permissive for select to public
  using ((user_id = auth.uid()));
create policy orders_owner_select on public.orders as permissive for select to public
  using ((user_id = auth.uid()));
create policy photos_owner_select on public.photos as permissive for select to public
  using ((user_id = ( SELECT auth.uid() AS uid)));
create policy photos_owner_delete on public.photos as permissive for delete to public
  using ((user_id = ( SELECT auth.uid() AS uid)));
create policy profiles_select_own on public.profiles as permissive for select to public
  using ((auth.uid() = id));
create policy profiles_update_own on public.profiles as permissive for update to public
  using ((( SELECT auth.uid() AS uid) = id))
  with check ((( SELECT auth.uid() AS uid) = id));
create policy referrals_party_select on public.referrals as permissive for select to public
  using (((referrer_id = auth.uid()) OR (referred_id = auth.uid())));
create policy salons_select_active on public.salons as permissive for select to public
  using (((is_active = true) OR (owner_id = auth.uid())));
create policy salons_update_own on public.salons as permissive for update to public
  using ((owner_id = ( SELECT auth.uid() AS uid)))
  with check ((owner_id = ( SELECT auth.uid() AS uid)));
create policy style_results_owner_select on public.style_results as permissive for select to public
  using ((user_id = ( SELECT auth.uid() AS uid)));

-- 10. Storage buckets and file access ------------------------------------
insert into storage.buckets (id, name, public) values ('carousel', 'carousel', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('results', 'results', false) on conflict (id) do nothing;

create policy "photos owner upload" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "photos owner read" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "photos owner delete" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "results owner read" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'results'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

-- 15.10.2026: WhatsApp numbers (supabase/migrations/20261015_whatsapp_contacts.sql)

create table public.whatsapp_contacts (
  id uuid default gen_random_uuid() primary key,
  phone text not null unique check (phone ~ '^\+91[6-9][0-9]{9}$'),
  user_id uuid references public.profiles(id) on delete set null,
  source text not null check (source in ('results', 'checkout', 'blog', 'trivia')),
  gender text check (gender in ('men', 'women')),
  face_shape text check (char_length(face_shape) <= 20),
  consent_text text not null check (char_length(consent_text) <= 300),
  opted_in_at timestamptz default now() not null,
  opted_out_at timestamptz,
  created_at timestamptz default now() not null
);

create index whatsapp_contacts_user_id_idx on public.whatsapp_contacts (user_id);
create index whatsapp_contacts_created_at_idx on public.whatsapp_contacts (created_at);

alter table public.whatsapp_contacts enable row level security;
revoke all on public.whatsapp_contacts from anon, authenticated;
grant all on public.whatsapp_contacts to service_role;

-- 21.10.2026: salon onboarding (supabase/migrations/20261021_salon_onboarding.sql)

-- 1. Salons -----------------------------------------------------------------
alter table public.salons
  add column if not exists slug text,
  add column if not exists owner_manager_name text,
  add column if not exists mobile text,
  add column if not exists whatsapp text,
  add column if not exists email text,
  add column if not exists instagram_handle text,
  add column if not exists area text,
  add column if not exists maps_url text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists customer_types text[] default '{}' not null,
  add column if not exists services text[] default '{}' not null,
  add column if not exists specialities text[] default '{}' not null,
  add column if not exists price_men_rupees integer,
  add column if not exists price_women_rupees integer,
  add column if not exists price_unisex_rupees integer,
  add column if not exists price_advanced_rupees integer,
  add column if not exists timings text,
  add column if not exists amenities text[] default '{}' not null,
  add column if not exists about text,
  add column if not exists status text default 'PENDING' not null,
  add column if not exists verification_status text default 'PENDING' not null,
  -- Free during the launch period. The paid plans come later.
  add column if not exists subscription_plan text default 'FREE' not null,
  add column if not exists admin_note text,
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_at timestamptz;

-- The market positioning, not a paid tier.
alter table public.salons drop constraint if exists salons_market_tier_check;
alter table public.salons add constraint salons_market_tier_check
  check (market_tier in ('Standard', 'Premium', 'Luxury', 'Ultra Premium'));
alter table public.salons alter column is_active set default false;

alter table public.salons add constraint salons_status_check check (status in ('PENDING', 'ACTIVE', 'SUSPENDED'));
alter table public.salons add constraint salons_verification_check
  check (verification_status in ('PENDING', 'VERIFIED', 'QUALITY_VERIFIED'));
alter table public.salons add constraint salons_plan_check
  check (subscription_plan in ('FREE', 'PREMIUM', 'PRO', 'ENTERPRISE'));
alter table public.salons add constraint salons_mobile_check check (mobile is null or mobile ~ '^\+91[6-9][0-9]{9}$');
alter table public.salons add constraint salons_whatsapp_check check (whatsapp is null or whatsapp ~ '^\+91[6-9][0-9]{9}$');
alter table public.salons add constraint salons_customer_types_check
  check (customer_types <@ array['MEN', 'WOMEN', 'UNISEX']::text[]);
alter table public.salons add constraint salons_prices_check check (
  (price_men_rupees is null or price_men_rupees between 0 and 100000) and
  (price_women_rupees is null or price_women_rupees between 0 and 100000) and
  (price_unisex_rupees is null or price_unisex_rupees between 0 and 100000) and
  (price_advanced_rupees is null or price_advanced_rupees between 0 and 100000)
);
alter table public.salons add constraint salons_text_lengths_check check (
  char_length(name) <= 80 and
  (owner_manager_name is null or char_length(owner_manager_name) <= 80) and
  (email is null or char_length(email) <= 120) and
  (instagram_handle is null or char_length(instagram_handle) <= 40) and
  (city is null or char_length(city) <= 60) and
  (area is null or char_length(area) <= 80) and
  (address is null or char_length(address) <= 300) and
  (maps_url is null or char_length(maps_url) <= 500) and
  (timings is null or char_length(timings) <= 300) and
  (about is null or char_length(about) <= 1000) and
  (admin_note is null or char_length(admin_note) <= 1000)
);

-- One salon per account (stops a double submission), and a unique web address.
create unique index if not exists salons_owner_unique on public.salons (owner_id);
create unique index if not exists salons_slug_unique on public.salons (slug);
create index if not exists salons_status_idx on public.salons (status);
create index if not exists salons_city_idx on public.salons (lower(city));
-- For Style Match later: find salons by speciality and service quickly.
create index if not exists salons_specialities_idx on public.salons using gin (specialities);
create index if not exists salons_services_idx on public.salons using gin (services);

-- Server-only, like the other private tables.
drop policy if exists salons_select_active on public.salons;
drop policy if exists salons_update_own on public.salons;
revoke all on public.salons from anon, authenticated;
grant all on public.salons to service_role;

-- 2. Salon photos -------------------------------------------------------------
create table if not exists public.salon_images (
  id uuid default gen_random_uuid() primary key,
  salon_id uuid not null references public.salons(id) on delete cascade,
  -- Path inside the public "salons" storage bucket: <owner id>/<file>.
  storage_path text not null check (char_length(storage_path) <= 200),
  image_type text not null check (image_type in
    ('EXTERIOR', 'INTERIOR', 'PORTFOLIO', 'RECEPTION', 'STYLING_AREA', 'HAIRCUT', 'HAIR_COLOUR', 'TEAM')),
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null
);
create index if not exists salon_images_salon_idx on public.salon_images (salon_id, sort_order);
alter table public.salon_images enable row level security;
revoke all on public.salon_images from anon, authenticated;
grant all on public.salon_images to service_role;

-- 3. Stylists (optional) ------------------------------------------------------
create table if not exists public.salon_stylists (
  id uuid default gen_random_uuid() primary key,
  salon_id uuid not null references public.salons(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  photo_path text check (photo_path is null or char_length(photo_path) <= 200),
  experience_years integer check (experience_years is null or experience_years between 0 and 60),
  specialities text[] default '{}' not null,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists salon_stylists_salon_idx on public.salon_stylists (salon_id, sort_order);
drop trigger if exists trg_salon_stylists_updated_at on public.salon_stylists;
create trigger trg_salon_stylists_updated_at before update on public.salon_stylists
  for each row execute function public.set_updated_at();
alter table public.salon_stylists enable row level security;
revoke all on public.salon_stylists from anon, authenticated;
grant all on public.salon_stylists to service_role;

-- 4. Onboarding and profile events (how many start, finish each step, finish) --
create table if not exists public.salon_events (
  id bigint generated always as identity primary key,
  event text not null check (event in (
    'salon_onboarding_started', 'salon_step_1_completed', 'salon_step_2_completed',
    'salon_step_3_completed', 'salon_onboarding_completed', 'salon_profile_viewed')),
  salon_id uuid references public.salons(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  visitor text check (visitor is null or char_length(visitor) <= 64),
  created_at timestamptz default now() not null
);
create index if not exists salon_events_event_idx on public.salon_events (event, created_at);
alter table public.salon_events enable row level security;
revoke all on public.salon_events from anon, authenticated;
grant all on public.salon_events to service_role;

-- 5. Photo storage --------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('salons', 'salons', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "salons owner upload" on storage.objects;
create policy "salons owner upload" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'salons'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
drop policy if exists "salons owner delete" on storage.objects;
create policy "salons owner delete" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'salons'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

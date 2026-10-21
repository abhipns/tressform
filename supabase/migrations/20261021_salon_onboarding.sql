-- 21.10.2026: salon onboarding (owner's brief "Salon Onboarding module").
--
-- Salons list themselves FREE during the launch period: no payment, no plan
-- to choose. Everything a salon gives is kept in separate, structured
-- columns (lists, not one text blob), because Tressform will later match a
-- customer's chosen hairstyle to salons and stylists ("Style Match"): by the
-- hairstyles a salon is good at, the hair types its stylists handle, its
-- portfolio, price and place.
--
-- Only the server (service_role) reads or writes these tables, through
-- /api/salons/* and the owner's /admin/salons page. Salon photos are in the
-- public "salons" storage bucket (they are shown on the public profile);
-- an owner may only upload into, and delete from, their own folder.
--
-- The salons table already existed from the original plan, unused (0 rows).

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

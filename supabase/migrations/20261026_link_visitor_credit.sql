-- 26.10.2026: credit for the visitors a customer's link brings.
--
-- ₹10 of credit (the usual non-cash Tressform credit) for every 10 different
-- visitors who open the site through a customer's referral link
-- (tressform.co.in/?ref=<code>). On top of the pack referral rewards, which
-- don't change, and inside the same ₹15,000-a-year cap. The rules are in
-- lib/linkVisits.ts; the amounts in lib/pricing.ts.
--
--   referral_link_visits     each visitor counted for a code, once
--                            (anonymous visitor id only, nothing personal)
--   referral_link_rewards    each ₹10 paid (10, 20, 30… visitors), once
--   referral_sharer_devices  devices a customer has used, so their own
--                            visits through their own link never count
--
-- All three are private: only the site's server reads or writes them.
--
-- Safe to run more than once.

create table if not exists public.referral_link_visits (
  code text not null check (char_length(code) <= 24),
  visitor text not null check (visitor ~ '^[A-Za-z0-9-]{8,64}$'),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  first_seen timestamp with time zone not null default now(),
  primary key (code, visitor)
);
create index if not exists referral_link_visits_code_day_idx on public.referral_link_visits (code, first_seen);
create index if not exists referral_link_visits_referrer_idx on public.referral_link_visits (referrer_id);

create table if not exists public.referral_link_rewards (
  code text not null check (char_length(code) <= 24),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  milestone integer not null check (milestone >= 1),
  visitors integer not null check (visitors >= 0),
  credits_paise integer not null check (credits_paise >= 0),
  created_at timestamp with time zone not null default now(),
  primary key (code, milestone)
);
create index if not exists referral_link_rewards_referrer_idx on public.referral_link_rewards (referrer_id, created_at);

create table if not exists public.referral_sharer_devices (
  user_id uuid not null references public.profiles(id) on delete cascade,
  visitor text not null check (visitor ~ '^[A-Za-z0-9-]{8,64}$'),
  created_at timestamp with time zone not null default now(),
  primary key (user_id, visitor)
);
create index if not exists referral_sharer_devices_visitor_idx on public.referral_sharer_devices (visitor);

alter table public.referral_link_visits enable row level security;
revoke all on public.referral_link_visits from anon, authenticated;
grant all on public.referral_link_visits to service_role;

alter table public.referral_link_rewards enable row level security;
revoke all on public.referral_link_rewards from anon, authenticated;
grant all on public.referral_link_rewards to service_role;

alter table public.referral_sharer_devices enable row level security;
revoke all on public.referral_sharer_devices from anon, authenticated;
grant all on public.referral_sharer_devices to service_role;

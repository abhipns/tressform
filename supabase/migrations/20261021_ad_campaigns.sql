-- 21.10.2026: which ad brought a visitor or a sale (Meta ads from 23.10.2026).
-- The site sends the ad link's tags (utm_source / utm_campaign / utm_content,
-- lib/campaign.ts) with page visits and orders; the owner's Dashboard adds
-- them up by campaign (/api/admin/campaigns). Nothing personal.

alter table public.site_visits
  add column if not exists utm_source text check (utm_source is null or char_length(utm_source) <= 80),
  add column if not exists utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 80),
  add column if not exists utm_content text check (utm_content is null or char_length(utm_content) <= 80);

alter table public.orders
  add column if not exists utm_source text check (utm_source is null or char_length(utm_source) <= 80),
  add column if not exists utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 80),
  add column if not exists utm_content text check (utm_content is null or char_length(utm_content) <= 80);

create index if not exists site_visits_utm_idx on public.site_visits (utm_source, utm_campaign, created_at) where utm_source is not null;
create index if not exists orders_utm_idx on public.orders (utm_source, utm_campaign) where utm_source is not null;

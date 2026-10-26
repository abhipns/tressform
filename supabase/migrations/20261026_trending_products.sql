-- 26.10.2026: "Trending for this season's hairstyles" on /haircare.
--
-- The owner ticks "Trending" on /admin/products for the products to
-- highlight at the top of the Hair Care page (up to 6 show). With none
-- ticked, the page shows the 6 most-tapped products of the last 30 days.
-- The table is already readable by the site (public select policy), so no
-- permission changes are needed.
--
-- Safe to run more than once.

alter table public.affiliate_products
  add column if not exists is_trending boolean default false not null;

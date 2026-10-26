-- 26.10.2026: single pictures — one hairstyle on the customer's own face,
-- bought picture by picture, next to the packs (which don't change).
--
-- Prices are in lib/pricing.ts: front ₹25; left side, right side, back ₹15
-- each; all four together ("Full look") ₹70. Views can be added later.
-- Single pictures earn no referral credit.
--
--   orders          gets the order kind ('PACK' for every existing order,
--                   'PICTURES' for the new ones), the hairstyle, the photo
--                   and which views were bought.
--   picture_views   (new, private) one row per paid view: whether it has
--                   been made, how many times it failed (3 failures =
--                   marked for refund on /admin/orders), and the picture.
--                   A view paid for twice is kept as 'DUPLICATE' so the
--                   owner can refund it; 'REFUNDED' once the owner has.
--
-- Also: the dashboard's pack list (admin_stats) names these orders
-- 'PICTURES' instead of breaking on an order with no pack.
--
-- Safe to run more than once.

alter table public.orders
  add column if not exists order_kind text not null default 'PACK',
  add column if not exists picture_style_id text,
  add column if not exists picture_photo_id uuid references public.photos(id) on delete set null,
  add column if not exists picture_views text[] not null default '{}'::text[];

alter table public.orders drop constraint if exists orders_order_kind_check;
alter table public.orders add constraint orders_order_kind_check check (order_kind in ('PACK', 'PICTURES'));
alter table public.orders drop constraint if exists orders_picture_style_id_check;
alter table public.orders add constraint orders_picture_style_id_check check (picture_style_id is null or char_length(picture_style_id) <= 80);
alter table public.orders drop constraint if exists orders_picture_views_check;
alter table public.orders add constraint orders_picture_views_check check (picture_views <@ array['front', 'left', 'right', 'back']::text[]);

create table if not exists public.picture_views (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_id uuid references public.photos(id) on delete set null,
  style_id text not null check (char_length(style_id) <= 80),
  view text not null check (view in ('front', 'left', 'right', 'back')),
  status text not null default 'READY' check (status in ('READY', 'MAKING', 'DONE', 'REFUND_DUE', 'DUPLICATE', 'REFUNDED')),
  failures integer not null default 0 check (failures >= 0),
  result_storage_path text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (order_id, view)
);
create unique index if not exists picture_views_once_idx
  on public.picture_views (user_id, photo_id, style_id, view) where status not in ('DUPLICATE', 'REFUNDED');
create index if not exists picture_views_user_idx on public.picture_views (user_id, style_id);

alter table public.picture_views enable row level security;
revoke all on public.picture_views from anon, authenticated;
grant all on public.picture_views to service_role;

-- Once an order is PAID: one row per view bought. A view this customer
-- already owns for the same photo and hairstyle is kept as 'DUPLICATE'.
create or replace function public.grant_picture_views(p_order uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  o record;
  v text;
  n integer := 0;
begin
  select * into o from public.orders where id = p_order and status = 'PAID' and order_kind = 'PICTURES';
  if not found then return 0; end if;
  foreach v in array o.picture_views loop
    if exists (select 1 from public.picture_views p
                where p.user_id = o.user_id and p.photo_id is not distinct from o.picture_photo_id
                  and p.style_id = o.picture_style_id and p.view = v
                  and p.status not in ('DUPLICATE', 'REFUNDED') and p.order_id <> p_order) then
      insert into public.picture_views (order_id, user_id, photo_id, style_id, view, status)
      values (p_order, o.user_id, o.picture_photo_id, o.picture_style_id, v, 'DUPLICATE')
      on conflict do nothing;
    else
      insert into public.picture_views (order_id, user_id, photo_id, style_id, view)
      values (p_order, o.user_id, o.picture_photo_id, o.picture_style_id, v)
      on conflict do nothing;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- Take one paid view to make it (one step, so two requests can't both make
-- it). A 'MAKING' mark older than 5 minutes was a run that crashed. Returns
-- the order id, or null when there is no paid view waiting.
create or replace function public.reserve_picture_view(p_user uuid, p_photo uuid, p_style text, p_view text)
returns uuid
language sql
set search_path to ''
as $$
  update public.picture_views pv
     set status = 'MAKING', updated_at = now()
   where (pv.order_id, pv.view) = (
           select p.order_id, p.view
             from public.picture_views p
             join public.orders o on o.id = p.order_id
            where p.user_id = p_user and p.photo_id = p_photo and p.style_id = p_style and p.view = p_view
              and o.status = 'PAID'
              and (p.status = 'READY' or (p.status = 'MAKING' and p.updated_at < now() - interval '5 minutes'))
            order by p.created_at
            limit 1
              for update of p skip locked)
  returning pv.order_id;
$$;

-- The picture was made (p_ok) or failed. A failure can be tried again for
-- free; the third failure marks the view for refund.
create or replace function public.finish_picture_view(p_order uuid, p_view text, p_ok boolean, p_path text)
returns text
language sql
set search_path to ''
as $$
  update public.picture_views
     set status = case when p_ok then 'DONE' when failures + 1 >= 3 then 'REFUND_DUE' else 'READY' end,
         failures = case when p_ok then failures else failures + 1 end,
         result_storage_path = case when p_ok then p_path else result_storage_path end,
         updated_at = now()
   where order_id = p_order and view = p_view and status = 'MAKING'
  returning status;
$$;

revoke all on function public.grant_picture_views(uuid) from public, anon, authenticated;
grant execute on function public.grant_picture_views(uuid) to service_role;
revoke all on function public.reserve_picture_view(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.reserve_picture_view(uuid, uuid, text, text) to service_role;
revoke all on function public.finish_picture_view(uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.finish_picture_view(uuid, text, boolean, text) to service_role;

-- The dashboard numbers, with single-picture orders named in the pack list.
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
  -- 26.10.2026: single-picture orders have no pack, so they count as 'PICTURES' (a null name would break this list).
  'by_pack', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
      select coalesce(tier::text, case when order_kind = 'PICTURES' then 'PICTURES' else 'ADDON' end) k, count(*) n
      from paid group by 1) t),
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

revoke all on function public.admin_stats(timestamp with time zone) from public, anon, authenticated;
grant execute on function public.admin_stats(timestamp with time zone) to service_role;

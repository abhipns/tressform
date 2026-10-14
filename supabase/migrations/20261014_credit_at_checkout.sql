-- 2026-10-14 — Tressform credit at checkout (see lib/credit.ts).
-- Additive only: nothing existing is changed or removed.
--   1. orders.credit_used_paise — credit put toward an order. price_paise
--      stays "what was actually charged".
--   2. spend_credit() — takes credit from a balance in one step, refusing if
--      the balance is too low (so the same credit can't be spent twice).
--   3. admin_stats() — also reports credit redeemed, for the dashboard.

alter table public.orders add column if not exists credit_used_paise integer default 0 not null;
alter table public.orders add constraint orders_credit_used_paise_check CHECK ((credit_used_paise >= 0));

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
revoke all on function public.spend_credit(uuid, integer) from public, anon, authenticated;
grant execute on function public.spend_credit(uuid, integer) to service_role;

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

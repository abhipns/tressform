-- 23.10.2026: try before signing in.
--
-- Visitors from the ads now upload their selfie and see their hairstyle list
-- under an anonymous Supabase account, and create their real account at
-- checkout (same account, email + password or Google). Two small database
-- changes go with it:
--
-- 1. When that anonymous account gets its email, copy it to profiles.email
--    (the new-user trigger only copies the email when an account is made,
--    and anonymous accounts are made without one).
-- 2. "Signed up" on the owner's stats page counts only accounts with an
--    email, so visitors who only tried the upload aren't counted as sign-ups.
--
-- Safe to run more than once.

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

create or replace function public.admin_stats(p_since timestamp with time zone)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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
  'signups', (select count(*) from profiles where created_at >= p_since and role <> 'ADMIN' and email is not null),
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

revoke all on function public.admin_stats(timestamptz) from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;

-- 3. The public "salons" bucket: only real accounts may upload salon photos,
--    not visitors who are trying the upload before signing in.
drop policy if exists "salons owner upload" on storage.objects;
create policy "salons owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'salons'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  );

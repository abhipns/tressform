-- 27.10.2026: paying without an account first, and the checkout funnel.
--
-- 23–27 Oct: 20 visitors reached checkout, 4 made an account, 0 pressed Pay.
-- Visitors now pay on their anonymous account (lib/checkoutSteps.ts).
--
--   orders.contact_email          the email a buyer without an account typed
--                                 at checkout (optional), for one email with
--                                 a private link to their looks
--   orders.results_email_sent_at  so that email is sent only once
--   checkout_events (new, private) each checkout step a visitor reached:
--                                 opened, phone, pay, return_success,
--                                 return_fail — the anonymous visitor id
--                                 only, never the phone number or email
--
-- Safe to run more than once.

alter table public.orders
  add column if not exists contact_email text,
  add column if not exists results_email_sent_at timestamp with time zone;
alter table public.orders drop constraint if exists orders_contact_email_check;
alter table public.orders add constraint orders_contact_email_check
  check (contact_email is null or (char_length(contact_email) <= 200 and contact_email like '%_@_%'));

create table if not exists public.checkout_events (
  id bigint generated always as identity primary key,
  visitor text check (visitor is null or visitor ~ '^[A-Za-z0-9-]{8,64}$'),
  step text not null check (step in ('opened', 'phone', 'pay', 'return_success', 'return_fail')),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamp with time zone not null default now()
);
create index if not exists checkout_events_created_idx on public.checkout_events (created_at);
create index if not exists checkout_events_order_idx on public.checkout_events (order_id) where order_id is not null;

alter table public.checkout_events enable row level security;
revoke all on public.checkout_events from anon, authenticated;
grant all on public.checkout_events to service_role;

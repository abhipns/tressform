-- 15.10.2026: WhatsApp numbers customers give us, with their consent.
-- Nothing is sent yet (that comes once there is traffic, through MSG91);
-- this keeps the list and the proof of each person's yes. Only the server
-- (service_role) reads or writes it, through /api/whatsapp/subscribe and
-- the owner's /admin/contacts page.

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

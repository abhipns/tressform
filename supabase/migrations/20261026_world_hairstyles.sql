-- 26.10.2026: "Hairstyles of the World" (/hairstyles) pictures.
--
-- The owner makes them in /admin/studio ("World hairstyles – make
-- pictures"); see lib/worldPictures.ts.
--
--   world_pictures   (new, private) which pictures have been made: each
--                    region's model photo ("before") and each style's front
--                    picture, where they are stored, and what they cost.
--   storage "world"  (new, public bucket) the pictures themselves: small
--                    WebP copies with the tressform.co.in mark for the
--                    gallery, and the full-size model photos the styles are
--                    made from. Only the site's server uploads to it (there
--                    is no upload rule for visitors); anyone can view.
--
-- Safe to run more than once.

create table if not exists public.world_pictures (
  kind text not null check (kind in ('model', 'style')),
  key text not null check (char_length(key) <= 80),
  full_path text,
  small_path text,
  cost_paise integer not null default 0 check (cost_paise >= 0),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (kind, key)
);

alter table public.world_pictures enable row level security;
revoke all on public.world_pictures from anon, authenticated;
grant all on public.world_pictures to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('world', 'world', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

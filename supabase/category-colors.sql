-- Esegui una sola volta nel SQL Editor di Supabase.
alter table public.categories
  add column if not exists color text not null default '#18181b';

-- Colore esadecimale CSS nel formato #RRGGBB.
alter table public.categories
  drop constraint if exists categories_color_hex_check;

alter table public.categories
  add constraint categories_color_hex_check
  check (color ~ '^#[0-9A-Fa-f]{6}$');

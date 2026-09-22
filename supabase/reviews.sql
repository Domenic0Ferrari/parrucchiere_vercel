-- Eseguire nel SQL Editor di Supabase prima di pubblicare le pagine delle recensioni.
-- Nessuna recensione viene pubblicata senza una decisione di un dipendente admin attivo.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null check (char_length(btrim(author_name)) between 2 and 80),
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id),
  constraint reviews_moderation_consistency check (
    (status = 'pending' and moderated_at is null and moderated_by is null)
    or (status in ('approved', 'rejected') and moderated_at is not null and moderated_by is not null)
  )
);

create index if not exists reviews_status_created_at_idx on public.reviews (status, created_at desc);

-- SECURITY DEFINER evita che le policy della tabella employees impediscano il controllo del ruolo.
create or replace function public.is_active_review_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.employees e
    where e.auth_user_id = (select auth.uid())
      and e.is_active = true and e.role = 'admin'
  );
$$;
revoke all on function public.is_active_review_admin() from public, anon;
grant execute on function public.is_active_review_admin() to authenticated;

-- Il client può aggiornare solo status. Il trigger registra chi ha moderato e quando.
create or replace function public.set_review_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pending' or new.status not in ('approved', 'rejected') then
    raise exception 'La recensione non può essere moderata in questo stato.';
  end if;
  new.moderated_at := now();
  new.moderated_by := (select auth.uid());
  return new;
end;
$$;
drop trigger if exists reviews_moderation_trigger on public.reviews;
create trigger reviews_moderation_trigger before update on public.reviews
for each row execute function public.set_review_moderation();

alter table public.reviews enable row level security;
drop policy if exists "Read approved reviews" on public.reviews;
create policy "Read approved reviews" on public.reviews
for select to anon, authenticated using (status = 'approved');
drop policy if exists "Admins read all reviews" on public.reviews;
create policy "Admins read all reviews" on public.reviews
for select to authenticated using ((select public.is_active_review_admin()));
drop policy if exists "Submit pending reviews" on public.reviews;
create policy "Submit pending reviews" on public.reviews
for insert to anon, authenticated with check (status = 'pending' and moderated_at is null and moderated_by is null);
drop policy if exists "Admins moderate pending reviews" on public.reviews;
create policy "Admins moderate pending reviews" on public.reviews
for update to authenticated
using (status = 'pending' and (select public.is_active_review_admin()))
with check (status in ('approved', 'rejected') and (select public.is_active_review_admin()));

revoke all on public.reviews from anon, authenticated;
grant select (id, author_name, rating, comment, status, created_at, moderated_at) on public.reviews to anon, authenticated;
grant insert (author_name, rating, comment) on public.reviews to anon, authenticated;
grant update (status) on public.reviews to authenticated;

-- Account clienti: eseguire dopo core-rls.sql. Le API server verificano l'identita'
-- e restituiscono soltanto i campi consentiti. Le policy delle tabelle restano
-- riservate agli addetti, per non esporre note interne o dati di altri clienti.
begin;

alter table public.customers add column if not exists auth_user_id uuid;
create unique index if not exists customers_auth_user_id_uidx
  on public.customers (auth_user_id) where auth_user_id is not null;

create or replace function public.find_customer_email_matches(p_email text)
returns table(id uuid, name text, phone text, auth_user_id uuid)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' and not public.is_active_admin() then
    raise exception 'Accesso non consentito';
  end if;
  return query
    select c.id, c.name, c.phone, c.auth_user_id
    from public.customers c
    where c.is_active = true and lower(btrim(c.email)) = lower(btrim(p_email))
    limit 2;
end;
$$;

revoke all on function public.find_customer_email_matches(text) from public, anon, authenticated;
grant execute on function public.find_customer_email_matches(text) to service_role, authenticated;

create or replace function public.merge_customer_bookings(p_source uuid, p_target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  source_row public.customers%rowtype;
  target_row public.customers%rowtype;
begin
  if not public.is_active_admin() then raise exception 'Accesso non consentito'; end if;
  if p_source = p_target then raise exception 'Seleziona due clienti diversi'; end if;
  select * into source_row from public.customers where id = p_source for update;
  select * into target_row from public.customers where id = p_target for update;
  if source_row.id is null or target_row.id is null or not source_row.is_active or not target_row.is_active
     or source_row.auth_user_id is not null or target_row.auth_user_id is null then
    raise exception 'Collegamento clienti non valido';
  end if;
  update public.appointments set customer_id = p_target, updated_at = clock_timestamp()
  where customer_id = p_source;
  update public.customers set is_active = false where id = p_source;
end;
$$;

revoke all on function public.merge_customer_bookings(uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_customer_bookings(uuid, uuid) to authenticated;

commit;

-- Eseguire nel SQL Editor di Supabase prima di pubblicare la nuova API booking.
begin;

-- PostgreSQL verifica questo vincolo dentro la stessa transazione dell'INSERT.
-- Fra due richieste concorrenti per lo stesso addetto e intervallo, solo una può riuscire.
create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_end_after_start'
  ) then
    alter table public.appointments
      add constraint appointments_end_after_start
      check (end_time > start_time);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_no_scheduled_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_no_scheduled_overlap
      exclude using gist (
        employee_id with =,
        tstzrange(start_time, end_time, '[)') with &&
      )
      where (status = 'scheduled');
  end if;
end;
$$;

-- Permette ai retry della stessa richiesta HTTP di non creare due appuntamenti.
alter table public.appointments
  add column if not exists booking_request_id uuid;

create unique index if not exists appointments_booking_request_id_uidx
  on public.appointments (booking_request_id)
  where booking_request_id is not null;

-- La prenotazione dal sito usa l'origine "public". Conserva i valori storici.
alter table public.appointments
  drop constraint if exists appointments_source_check;
alter table public.appointments
  add constraint appointments_source_check
  check (appointment_source in ('admin', 'staff', 'online', 'public'));

-- Rate limit condiviso fra tutte le istanze serverless.
create table if not exists public.booking_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

revoke all on public.booking_rate_limits from public, anon, authenticated;

create index if not exists booking_rate_limits_window_started_at_idx
  on public.booking_rate_limits (window_started_at);

create or replace function public.consume_booking_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  next_count integer;
begin
  if p_key is null or length(p_key) < 16 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Parametri rate limit non validi.';
  end if;

  insert into public.booking_rate_limits as limits (rate_key, window_started_at, request_count)
  values (p_key, v_now, 1)
  on conflict (rate_key) do update
  set
    window_started_at = case
      when limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else limits.request_count + 1
    end
  returning request_count into next_count;

  -- Pulizia opportunistica per non far crescere indefinitamente la tabella.
  if random() < 0.01 then
    delete from public.booking_rate_limits
    where window_started_at < v_now - interval '1 day';
  end if;

  return next_count <= p_limit;
end;
$$;

revoke all on function public.consume_booking_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_booking_rate_limit(text, integer, integer) to service_role;

commit;

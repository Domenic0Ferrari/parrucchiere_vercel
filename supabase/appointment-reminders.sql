-- Reminder email: eseguire nel SQL Editor di Supabase prima di pubblicare il cron.
-- La chiave univoca rende idempotente l'invio se Vercel invoca il job due volte.
begin;

create table if not exists public.appointment_notifications (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  kind text not null check (kind in ('reminder_next_day')),
  sent_at timestamptz not null default clock_timestamp(),
  unique (appointment_id, kind)
);

alter table public.appointment_notifications enable row level security;
revoke all on table public.appointment_notifications from anon, authenticated;

commit;

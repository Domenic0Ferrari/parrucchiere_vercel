-- Privacy: eseguire nel SQL Editor di Supabase prima di pubblicare la checkbox.
-- Ogni prenotazione online conserva versione dell'informativa, momento della presa
-- visione e data di revisione della conservazione.
begin;

alter table public.appointments add column if not exists privacy_accepted_at timestamptz;
alter table public.appointments add column if not exists privacy_policy_version text;
alter table public.appointments add column if not exists privacy_retention_until date;

create index if not exists appointments_privacy_retention_until_idx
  on public.appointments (privacy_retention_until)
  where privacy_retention_until is not null;

commit;

-- Eseguire dopo reviews.sql: le nuove recensioni passano soltanto dall'API
-- server-side, che applica rate limit e validazione prima dell'inserimento.
begin;

drop policy if exists "Submit pending reviews" on public.reviews;
revoke insert on public.reviews from anon, authenticated;

commit;

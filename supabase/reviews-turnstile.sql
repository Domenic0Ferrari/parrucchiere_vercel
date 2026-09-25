-- Eseguire dopo reviews.sql per fare passare ogni nuova recensione dall'API
-- protetta da Turnstile e rate limit. Il service role dell'API bypassa RLS.
begin;

drop policy if exists "Submit pending reviews" on public.reviews;
revoke insert on public.reviews from anon, authenticated;

commit;

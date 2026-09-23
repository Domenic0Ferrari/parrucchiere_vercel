-- Campi facoltativi dei clienti: l'assenza di un valore e' rappresentata da NULL.
-- Il vecchio default era il testo letterale '' (due apici), non una stringa vuota.
begin;

alter table public.customers
  alter column name drop default,
  alter column phone drop default,
  alter column phone drop not null,
  alter column email drop default,
  alter column email drop not null,
  alter column note drop default,
  alter column note drop not null;

update public.customers
set phone = case when btrim(phone) in ('', chr(39) || chr(39)) then null else phone end,
    email = case when btrim(email) in ('', chr(39) || chr(39)) then null else email end,
    note = case when btrim(note) in ('', chr(39) || chr(39)) then null else note end
where btrim(phone) in ('', chr(39) || chr(39))
   or btrim(email) in ('', chr(39) || chr(39))
   or btrim(note) in ('', chr(39) || chr(39));

commit;

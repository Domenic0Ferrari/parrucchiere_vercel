-- Hardening RLS per lo schema single-salone corrente.
-- Eseguire dopo un backup e prima del collaudo descritto in SETUP_PRODUZIONE.md.
begin;

create or replace function public.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employees employee
    where employee.auth_user_id = (select auth.uid())
      and employee.is_active = true
  );
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employees employee
    where employee.auth_user_id = (select auth.uid())
      and employee.is_active = true
      and employee.role = 'admin'
  );
$$;

revoke all on function public.is_active_employee() from public, anon;
revoke all on function public.is_active_admin() from public, anon;
grant execute on function public.is_active_employee() to authenticated;
grant execute on function public.is_active_admin() to authenticated;

alter table public.employees enable row level security;
alter table public.services enable row level security;
alter table public.categories enable row level security;
alter table public.categories2services enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.salon enable row level security;
alter table public.salon_opening_hours enable row level security;
alter table public.salon_closures enable row level security;

-- employees: ogni dipendente vede il proprio profilo; gli admin vedono il team.
drop policy if exists "employee can read own profile" on public.employees;
drop policy if exists "Active employees read permitted employee profiles" on public.employees;
create policy "Active employees read permitted employee profiles"
on public.employees for select to authenticated
using (
  (auth_user_id = (select auth.uid()) and is_active = true)
  or (select public.is_active_admin())
);

-- services: il sito pubblico passa dall'API server; solo dipendenti attivi usano la tabella.
drop policy if exists "Allow insert for authenticated users" on public.services;
drop policy if exists "Authenticated update services" on public.services;
drop policy if exists "Enable read access for all users" on public.services;
drop policy if exists "Active employees read services" on public.services;
drop policy if exists "Active employees insert services" on public.services;
drop policy if exists "Active employees update services" on public.services;
create policy "Active employees read services"
on public.services for select to authenticated
using ((select public.is_active_employee()));
create policy "Active employees insert services"
on public.services for insert to authenticated
with check ((select public.is_active_employee()));
create policy "Active employees update services"
on public.services for update to authenticated
using ((select public.is_active_employee()))
with check ((select public.is_active_employee()));

-- categories: tutti i dipendenti le leggono, solo l'admin le configura.
drop policy if exists "admin can insert service categories" on public.categories;
drop policy if exists "admin can update service categories" on public.categories;
drop policy if exists "employees can read all service categories" on public.categories;
drop policy if exists "public can read active service categories" on public.categories;
drop policy if exists "Active employees read categories" on public.categories;
drop policy if exists "Admins insert categories" on public.categories;
drop policy if exists "Admins update categories" on public.categories;
create policy "Active employees read categories"
on public.categories for select to authenticated
using ((select public.is_active_employee()));
create policy "Admins insert categories"
on public.categories for insert to authenticated
with check ((select public.is_active_admin()));
create policy "Admins update categories"
on public.categories for update to authenticated
using ((select public.is_active_admin()))
with check ((select public.is_active_admin()));

-- I dipendenti che gestiscono i servizi possono aggiornarne i collegamenti alle categorie.
drop policy if exists "Active employees can delete service category links" on public.categories2services;
drop policy if exists "Active employees can insert service category links" on public.categories2services;
drop policy if exists "Public users can read service category links" on public.categories2services;
drop policy if exists "Active employees read service category links" on public.categories2services;
drop policy if exists "Active employees insert service category links" on public.categories2services;
drop policy if exists "Active employees delete service category links" on public.categories2services;
create policy "Active employees read service category links"
on public.categories2services for select to authenticated
using ((select public.is_active_employee()));
create policy "Active employees insert service category links"
on public.categories2services for insert to authenticated
with check ((select public.is_active_employee()));
create policy "Active employees delete service category links"
on public.categories2services for delete to authenticated
using ((select public.is_active_employee()));

-- customers: dati personali accessibili esclusivamente ai dipendenti attivi.
drop policy if exists "employees can insert customers" on public.customers;
drop policy if exists "employees can read customers" on public.customers;
drop policy if exists "employees can update customers" on public.customers;
drop policy if exists "Active employees read customers" on public.customers;
drop policy if exists "Active employees insert customers" on public.customers;
drop policy if exists "Active employees update customers" on public.customers;
create policy "Active employees read customers"
on public.customers for select to authenticated
using ((select public.is_active_employee()));
create policy "Active employees insert customers"
on public.customers for insert to authenticated
with check ((select public.is_active_employee()));
create policy "Active employees update customers"
on public.customers for update to authenticated
using ((select public.is_active_employee()))
with check ((select public.is_active_employee()));

-- appointments: admin su tutto; dipendente soltanto sui propri appuntamenti.
drop policy if exists "employees can insert appointments" on public.appointments;
drop policy if exists "employees can read appointments" on public.appointments;
drop policy if exists "employees can update appointments" on public.appointments;
drop policy if exists "Employees read permitted appointments" on public.appointments;
drop policy if exists "Employees insert permitted appointments" on public.appointments;
drop policy if exists "Employees update permitted appointments" on public.appointments;
create policy "Employees read permitted appointments"
on public.appointments for select to authenticated
using (
  (select public.is_active_admin())
  or employee_id = (
    select employee.id from public.employees employee
    where employee.auth_user_id = (select auth.uid()) and employee.is_active = true
  )
);
create policy "Employees insert permitted appointments"
on public.appointments for insert to authenticated
with check (
  (select public.is_active_admin())
  or employee_id = (
    select employee.id from public.employees employee
    where employee.auth_user_id = (select auth.uid()) and employee.is_active = true
  )
);
create policy "Employees update permitted appointments"
on public.appointments for update to authenticated
using (
  (select public.is_active_admin())
  or employee_id = (
    select employee.id from public.employees employee
    where employee.auth_user_id = (select auth.uid()) and employee.is_active = true
  )
)
with check (
  (select public.is_active_admin())
  or employee_id = (
    select employee.id from public.employees employee
    where employee.auth_user_id = (select auth.uid()) and employee.is_active = true
  )
);

-- Tutti i dipendenti devono leggere orari/chiusure per validare l'agenda; solo admin scrive.
drop policy if exists "Admin can update salon" on public.salon;
drop policy if exists "Admins can create salon" on public.salon;
drop policy if exists "Admins can view salon" on public.salon;
drop policy if exists "Active employees read salon" on public.salon;
drop policy if exists "Admins insert salon" on public.salon;
drop policy if exists "Admins update salon" on public.salon;
create policy "Active employees read salon"
on public.salon for select to authenticated
using ((select public.is_active_employee()));
create policy "Admins insert salon"
on public.salon for insert to authenticated
with check ((select public.is_active_admin()));
create policy "Admins update salon"
on public.salon for update to authenticated
using ((select public.is_active_admin()))
with check ((select public.is_active_admin()));

drop policy if exists "Admins can manage salon opening hours" on public.salon_opening_hours;
drop policy if exists "Active employees read salon opening hours" on public.salon_opening_hours;
drop policy if exists "Admins manage salon opening hours" on public.salon_opening_hours;
create policy "Active employees read salon opening hours"
on public.salon_opening_hours for select to authenticated
using ((select public.is_active_employee()));
create policy "Admins manage salon opening hours"
on public.salon_opening_hours for all to authenticated
using ((select public.is_active_admin()))
with check ((select public.is_active_admin()));

drop policy if exists "Admin can ""ALL"" salon closures" on public.salon_closures;
drop policy if exists "Active employees read salon closures" on public.salon_closures;
drop policy if exists "Admins manage salon closures" on public.salon_closures;
create policy "Active employees read salon closures"
on public.salon_closures for select to authenticated
using ((select public.is_active_employee()));
create policy "Admins manage salon closures"
on public.salon_closures for all to authenticated
using ((select public.is_active_admin()))
with check ((select public.is_active_admin()));

-- Privilegi SQL: RLS decide quali righe; questi GRANT decidono quali operazioni esistono.
revoke all on public.employees, public.services, public.categories,
  public.categories2services, public.customers, public.appointments,
  public.salon, public.salon_opening_hours, public.salon_closures
from anon, authenticated;

grant select on public.employees to authenticated;
grant select, insert, update on public.services to authenticated;
grant select, insert, update on public.categories to authenticated;
grant select, insert, delete on public.categories2services to authenticated;
grant select, insert, update on public.customers to authenticated;
grant select, insert, update on public.appointments to authenticated;
grant select, insert, update on public.salon to authenticated;
grant select, insert, update, delete on public.salon_opening_hours to authenticated;
grant select, insert, update, delete on public.salon_closures to authenticated;

commit;

create index if not exists categories2services_categories_id_idx
	on public.categories2services (categories_id);

alter table public.categories2services enable row level security;

create policy "Public users can read service category links"
	on public.categories2services
	for select
	to anon, authenticated
	using (true);

create policy "Active employees can insert service category links"
	on public.categories2services
	for insert
	to authenticated
	with check (
		exists (
			select 1
			from public.employees
			where employees.auth_user_id = auth.uid()
				and employees.is_active = true
		)
	);

create policy "Active employees can delete service category links"
	on public.categories2services
	for delete
	to authenticated
	using (
		exists (
			select 1
			from public.employees
			where employees.auth_user_id = auth.uid()
				and employees.is_active = true
		)
	);

alter table public.services
	alter column is_active drop default;

alter table public.services
	alter column is_active type boolean
	using (
		case
			when is_active is null then true
			when is_active = 0 then false
			else true
		end
	);

alter table public.services
	alter column is_active set default true;

update public.services
set is_active = true
where is_active is null;

alter table public.services
	alter column is_active set not null;

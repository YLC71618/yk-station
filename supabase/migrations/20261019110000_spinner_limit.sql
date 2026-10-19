-- Cap the standing spinner options. KEEP IN SYNC with SPINNER_MAX_OPTIONS in src/config/recipes.ts.
create or replace function public.limit_wheel_options() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.wheel_options) >= 12 then
    raise exception 'spinner_full';
  end if;
  return new;
end $$;

create trigger limit_wheel_options before insert on public.wheel_options
  for each row execute function public.limit_wheel_options();

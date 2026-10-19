-- The claw machine holds more than the wheel did. KEEP IN SYNC with SPINNER_MAX_OPTIONS in src/config/recipes.ts.
create or replace function public.limit_wheel_options() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.wheel_options) >= 24 then
    raise exception 'spinner_full';
  end if;
  return new;
end $$;

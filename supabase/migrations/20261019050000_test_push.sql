-- "Send me a test notification" button in Settings.
create or replace function public.test_push() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me text := public.my_role();
begin
  if me is null then raise exception 'not a member'; end if;
  perform public.queue_push(me, 'test', jsonb_build_object('who', me), '/settings');
end $$;

revoke execute on function public.test_push() from public, anon;
grant execute on function public.test_push() to authenticated;

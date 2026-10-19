-- YK Station · Milestone 8: shopping lists.

-- Tick / untick. Ticking the last open item of a list pays whoever ticked it, once per "round"
-- (a round ends when a new item is added), so ticking on and off can't farm coins.
create or replace function public.tick_item(p_id uuid, p_done boolean) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me text := public.my_role();
  it public.shopping_items;
  round_key text;
  n int := public.rule_int('coins', 'shoppingListCleared');
begin
  if me is null then raise exception 'not a member'; end if;
  update public.shopping_items set done = p_done where id = p_id returning * into it;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  if p_done and not exists (select 1 from public.shopping_items where list = it.list and not done) then
    select it.list || ':' || max(created_at)::text into round_key from public.shopping_items where list = it.list;
    if not exists (select 1 from public.coin_ledger where reason = 'shopping_cleared' and ref_id = round_key) then
      insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
      values (me, n, 'shopping_cleared', 'shopping_items', round_key);
      return jsonb_build_object('ok', true, 'cleared', true, 'coins', n);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'cleared', false);
end $$;

revoke execute on function public.tick_item(uuid, boolean) from public, anon;
grant execute on function public.tick_item(uuid, boolean) to authenticated;

-- Items are added and deleted directly; ticking goes through tick_item.
drop policy "members change" on public.shopping_items;

alter publication supabase_realtime add table public.shopping_items;

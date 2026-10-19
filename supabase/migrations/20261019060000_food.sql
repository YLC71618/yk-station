-- YK Station · Milestone 7: food wish lists and the spinner.

-- 「煮了！」: coins for both, bear energy up, dish leaves the list.
create or replace function public.cook_wish(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  w public.food_wishes;
  n int := public.rule_int('coins', 'cookedWish');
begin
  if public.my_role() is null then raise exception 'not a member'; end if;
  select * into w from public.food_wishes where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if w.cooked_at is not null then return jsonb_build_object('ok', false, 'error', 'already'); end if;

  update public.food_wishes set cooked_at = now() where id = p_id;
  insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
  values ('yoyo', n, 'cooked', 'food_wishes', p_id::text), ('kyle', n, 'cooked', 'food_wishes', p_id::text);
  perform public.bump_stat('energy', public.rule_int('bear', 'energy', 'cooked'));
  return jsonb_build_object('ok', true, 'coins', n);
end $$;

revoke execute on function public.cook_wish(uuid) from public, anon;
grant execute on function public.cook_wish(uuid) to authenticated;

-- Cooking only through cook_wish (it pays coins); the list itself stays freely editable.
drop policy "members all" on public.food_wishes;
create policy "members read" on public.food_wishes for select to authenticated using (public.is_member());
create policy "members add" on public.food_wishes for insert to authenticated with check (public.is_member() and cooked_at is null);
create policy "members delete" on public.food_wishes for delete to authenticated using (public.is_member());
create policy "members cycle source" on public.food_wishes for update to authenticated using (public.is_member()) with check (public.is_member());
revoke update on public.food_wishes from authenticated;
grant update (source_index) on public.food_wishes to authenticated;

-- Starter spinner options from the mockup (editable in Settings).
insert into public.wheel_options (name) values ('拉麵'), ('咖哩飯'), ('火鍋'), ('炸雞'), ('壽司'), ('牛肉麵')
on conflict (name) do nothing;

alter publication supabase_realtime add table public.food_wishes, public.wheel_options;

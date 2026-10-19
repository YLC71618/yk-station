-- YK Station · Milestone 5: Kyle's chores and the hand-drying score.

-- Internal: start an illness. Only one at a time: a new illness always starts mild,
-- so an existing one is at least as severe and wins; the newcomer is only recorded.
create or replace function public.make_ill(p_illness text, p_caused_by text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bear;
begin
  select * into b from public.bear where id = 1 for update;
  if b.illness is not null then
    insert into public.bear_events (kind, payload)
    values ('illness_skipped', jsonb_build_object('illness', p_illness, 'caused_by', p_caused_by, 'kept', b.illness));
    return;
  end if;
  update public.bear
    set illness = p_illness, severity = 'mild', caused_by = p_caused_by, ill_since = now(), updated_at = now()
    where id = 1;
  insert into public.bear_events (kind, payload)
  values ('fell_ill', jsonb_build_object('illness', p_illness, 'severity', 'mild', 'caused_by', p_caused_by));
end $$;

-- Internal: change one bear stat within the floor/ceiling.
create or replace function public.bump_stat(p_stat text, p_delta int) returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v int;
begin
  execute format('update public.bear set %1$I = public.clamp_stat(%1$I + $1), updated_at = now() where id = 1 returning %1$I', p_stat)
    into v using p_delta;
  return v;
end $$;

-- Days until a chore is due, on the London calendar (negative = overdue).
create or replace function public.chore_days_left(c public.chores) returns int
language sql stable set search_path = ''
as $$ select (public.london_date(c.last_done_at) + c.interval_days) - public.london_date() $$;

-- Kyle: 「完成了」. On time (on or before the due day) earns coins.
create or replace function public.complete_chore(p_kind text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.chores;
  on_time boolean;
  earned int := 0;
begin
  if public.my_role() is distinct from 'kyle' then return jsonb_build_object('ok', false, 'error', 'not_kyle'); end if;
  select * into c from public.chores where kind = p_kind for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'bad_kind'); end if;

  on_time := public.chore_days_left(c) >= 0;
  if on_time then
    earned := public.rule_int('coins', 'choreOnTime');
    insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
    values ('kyle', earned, 'chore_' || p_kind, 'chores', c.id::text);
  end if;
  update public.chores set last_done_at = now() where id = c.id;
  insert into public.bear_events (kind, payload) values ('chore_done', jsonb_build_object('kind', p_kind, 'on_time', on_time));
  return jsonb_build_object('ok', true, 'on_time', on_time, 'earned', earned);
end $$;

-- Yoyo: +1 有擦乾 / −1 沒擦乾.
create or replace function public.score_hand(p_delta int) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  hid uuid;
  clean int;
begin
  if public.my_role() is distinct from 'yoyo' then return jsonb_build_object('ok', false, 'error', 'not_yoyo'); end if;
  if p_delta not in (1, -1) then return jsonb_build_object('ok', false, 'error', 'bad_delta'); end if;

  insert into public.hand_scores (delta) values (p_delta) returning id into hid;
  if p_delta = 1 then
    insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
    values ('kyle', public.rule_int('coins', 'handScorePlus'), 'hand', 'hand_scores', hid::text);
    clean := public.bump_stat('clean', public.rule_int('bear', 'clean', 'handPlus'));
  else
    clean := public.bump_stat('clean', public.rule_int('bear', 'clean', 'handMinus'));
    if clean < public.rule_int('bear', 'clean', 'crackedPawsBelow') then
      perform public.make_ill('cracked_paws', 'kyle');
    end if;
  end if;
  return jsonb_build_object('ok', true, 'clean', clean);
end $$;

-- Clients score only through score_hand.
drop policy "only yoyo scores hands" on public.hand_scores;

revoke execute on function public.make_ill(text, text), public.bump_stat(text, int) from public, anon, authenticated;
revoke execute on function public.complete_chore(text), public.score_hand(int) from public, anon;
grant execute on function public.complete_chore(text), public.score_hand(int), public.chore_days_left(public.chores) to authenticated;

alter publication supabase_realtime add table public.chores, public.hand_scores;

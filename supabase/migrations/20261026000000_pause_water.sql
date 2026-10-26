-- Pause switch for the water feature (Yoyo's request): no water notifications, no dehydration
-- or Yoyo streak changes at day end, Kyle can't send requests. Toggled from Settings.

insert into public.app_config (key, value) values ('water_paused', 'true')
on conflict (key) do update set value = excluded.value;

create or replace function public.water_paused() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select value = 'true' from public.app_config where key = 'water_paused'), false) $$;

create or replace function public.set_water_paused(p_paused boolean) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if public.my_role() is null then raise exception 'not a member'; end if;
  insert into public.app_config (key, value) values ('water_paused', p_paused::text)
  on conflict (key) do update set value = excluded.value;
  -- Pausing also closes any open request so no card or badge lingers.
  if p_paused then
    update public.water_requests set resolved_at = now() where resolved_at is null;
  end if;
end $$;

revoke execute on function public.set_water_paused(boolean) from public, anon;
grant execute on function public.water_paused(), public.set_water_paused(boolean) to authenticated;

alter table public.daily_results add column water_paused boolean not null default false;

-- Close requests that are open right now.
update public.water_requests set resolved_at = now() where resolved_at is null;


create or replace function public.queue_push(p_to text, p_kind text, p_params jsonb default '{}', p_url text default '/') returns void
language plpgsql security definer set search_path = ''
as $$
begin
  -- Water paused: no water notifications at all.
  if p_kind like 'water%' and public.water_paused() then return; end if;
  insert into public.push_queue (to_role, kind, params, url) values (p_to, p_kind, p_params, p_url);
end $$;

create or replace function public.request_water() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  rid uuid;
  existing boolean := false;
  reping int := public.rule_int('water', 'requestRepingMinutes');
begin
  if public.my_role() is distinct from 'kyle' then return jsonb_build_object('ok', false, 'error', 'not_kyle'); end if;
  if public.water_paused() then return jsonb_build_object('ok', false, 'error', 'paused'); end if;
  select id into rid from public.water_requests where resolved_at is null order by created_at desc limit 1;
  if rid is not null then
    existing := true;
    update public.water_requests set snoozed_until = null, next_ping_at = now() + make_interval(mins => reping) where id = rid;
  else
    insert into public.water_requests (next_ping_at) values (now() + make_interval(mins => reping)) returning id into rid;
  end if;
  perform public.queue_push('yoyo', 'water_request', '{}', '/yoyo');
  return jsonb_build_object('ok', true, 'id', rid, 'existing', existing);
end $$;

create or replace function public.day_end(p_day date) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bear;
  c public.chores;
  goal int := public.rule_int('water', 'dailyGoalYoyo');
  cups int := public.approved_cups('yoyo', p_day);
  days_ill int;
  new_sev text;
  kyle_ok boolean := true;
  active boolean;
  s public.streaks;
  streak_days int := public.rule_int('coins', 'perfectStreakDays');
begin
  select * into b from public.bear where id = 1;

  -- Existing illness: mood drops, then severity escalates if still untreated.
  if b.illness is not null then
    perform public.bump_stat('mood', public.rule_int('bear', 'mood', 'perIllDay'));
    days_ill := (p_day + 1) - public.london_date(b.ill_since);
    new_sev := case
      when days_ill >= public.rule_int('bear', 'escalation', 'severeAfterDays') then 'severe'
      when days_ill >= public.rule_int('bear', 'escalation', 'moderateAfterDays') then 'moderate'
      else b.severity end;
    if new_sev is distinct from b.severity and b.hospital_until is null
       and array_position(array['mild', 'moderate', 'severe'], new_sev) > array_position(array['mild', 'moderate', 'severe'], b.severity) then
      update public.bear set severity = new_sev, updated_at = now() where id = 1;
      insert into public.bear_events (kind, payload)
      values ('severity_up', jsonb_build_object('illness', b.illness, 'severity', new_sev, 'caused_by', b.caused_by));
    end if;
  end if;

  -- Yoyo's water goal.
  if cups < goal and not public.water_paused() then
    perform public.bump_stat('water', public.rule_int('bear', 'water', 'missedGoal'));
    perform public.make_ill('dehydration', 'yoyo');
  end if;

  -- Kyle's chores overdue by at least a day at the end of p_day.
  for c in select * from public.chores loop
    if public.london_date(c.last_done_at) + c.interval_days < p_day then
      kyle_ok := false;
      perform public.bump_stat('clean', public.rule_int('bear', 'clean', 'overduePerDay'));
      perform public.make_ill(case c.kind when 'shave' then 'rash' else 'ingrown_claw' end, 'kyle');
    end if;
  end loop;
  if exists (select 1 from public.hand_scores where delta < 0 and public.london_date(created_at) = p_day) then
    kyle_ok := false;
  end if;

  -- Nobody did anything all day: energy drops.
  active := exists (select 1 from public.water_logs where public.london_date(created_at) = p_day)
    or exists (select 1 from public.hand_scores where public.london_date(created_at) = p_day)
    or exists (select 1 from public.coin_ledger where amount > 0 and public.london_date(created_at) = p_day)
    or exists (select 1 from public.bear_events where kind = 'chore_done' and public.london_date(created_at) = p_day);
  if not active then
    perform public.bump_stat('energy', public.rule_int('bear', 'energy', 'idleDay'));
  end if;

  -- Perfect streaks: +coins every perfectStreakDays days in a row.
  for s in select * from public.streaks for update loop
    -- Water paused: Yoyo's streak is frozen, neither growing nor reset.
    continue when s.role = 'yoyo' and public.water_paused();
    if (s.role = 'yoyo' and cups >= goal) or (s.role = 'kyle' and kyle_ok) then
      update public.streaks set days = days + 1, last_day = p_day where role = s.role;
      if (s.days + 1) % streak_days = 0 then
        insert into public.coin_ledger (role, amount, reason) values (s.role, public.rule_int('coins', 'perfectStreak'), 'streak');
        perform public.queue_push(s.role, 'streak', jsonb_build_object('days', s.days + 1, 'coins', public.rule_int('coins', 'perfectStreak')), '/');
      end if;
    else
      update public.streaks set days = 0, last_day = p_day where role = s.role;
    end if;
  end loop;
end $$;

create or replace function public.record_day(p_day date) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  cups int := public.approved_cups('yoyo', p_day);
  kyle_ok boolean;
begin
  kyle_ok := not exists (select 1 from public.chores c where public.london_date(c.last_done_at) + c.interval_days < p_day)
    and not exists (select 1 from public.hand_scores where delta < 0 and public.london_date(created_at) = p_day);
  insert into public.daily_results (day, yoyo_cups, yoyo_ok, kyle_ok, water_paused)
  values (p_day, cups, cups >= public.rule_int('water', 'dailyGoalYoyo'), kyle_ok, public.water_paused())
  on conflict (day) do update set yoyo_cups = excluded.yoyo_cups, yoyo_ok = excluded.yoyo_ok, kyle_ok = excluded.kyle_ok, water_paused = excluded.water_paused;
end $$;

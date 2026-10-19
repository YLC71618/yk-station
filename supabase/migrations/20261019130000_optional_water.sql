-- After Yoyo's daily goal: requests become optional (accept for a bonus, or decline).
-- KEEP IN SYNC with src/config/rules.ts.

create or replace function public.game_rules() returns jsonb
language sql immutable set search_path = ''
as $$
  select '{
    "timeZone": "Europe/London",
    "statMin": 5,
    "statMax": 100,
    "moodTreatment": 15,
    "coins": {
      "waterCupApproved": 5, "extraCupBonus": 5, "choreOnTime": 5, "handScorePlus": 2,
      "perfectStreak": 30, "perfectStreakDays": 7, "cookedWish": 10, "shoppingListCleared": 5
    },
    "water": {
      "dailyGoalYoyo": 8, "requestRepingMinutes": 30, "snoozeMinutes": 30, "maxSnoozesPerDay": 2,
      "photoRetentionDays": 14, "selfReminderHours": [10, 13, 16, 19], "paceStartHour": 8, "paceEndHour": 22
    },
    "chores": { "shaveIntervalDays": 2, "nailsIntervalDays": 9, "reminderHour": 9 },
    "bear": {
      "water": { "approvedCup": 10, "missedGoal": -20 },
      "clean": { "handPlus": 5, "handMinus": -10, "overduePerDay": -10, "crackedPawsBelow": 40 },
      "mood": { "perIllDay": -5, "bluesBelow": 40 },
      "energy": { "cooked": 10, "idleDay": -10, "exhaustedBelow": 40 },
      "escalation": { "moderateAfterDays": 2, "severeAfterDays": 4 }
    },
    "treatments": {
      "medicine":  { "cost": 30,  "cures": ["mild"],                       "statBoost": 30, "waitHours": 0 },
      "injection": { "cost": 80,  "cures": ["mild", "moderate"],           "statBoost": 50, "waitHours": 0 },
      "hospital":  { "cost": 200, "cures": ["mild", "moderate", "severe"], "statBoost": 65, "waitHours": 2 }
    }
  }'::jsonb
$$;

create or replace function public.run_rules() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  today date := public.london_date();
  hour int := extract(hour from now() at time zone (public.game_rules()->>'timeZone'))::int;
  r public.water_requests;
  c public.chores;
  goal int := public.rule_int('water', 'dailyGoalYoyo');
  pace_start int := public.rule_int('water', 'paceStartHour');
  pace_end int := public.rule_int('water', 'paceEndHour');
  expected int;
  cups int;
  left_days int;
begin
  perform public.settle_bear();

  if public.claim_run('day_end', today - 1) then
    perform public.run_day_end(today - 1);
  end if;

  -- Once Yoyo's goal is met, a request is optional: no more re-pings.
  if public.approved_cups('yoyo', today) < goal then
    for r in select * from public.water_requests where resolved_at is null and next_ping_at <= now() for update loop
      update public.water_requests
        set next_ping_at = now() + make_interval(mins => public.rule_int('water', 'requestRepingMinutes')), snoozed_until = null
        where id = r.id;
      perform public.queue_push('yoyo', 'water_request', '{}', '/yoyo');
    end loop;
  end if;

  if (public.game_rules()->'water'->'selfReminderHours') @> to_jsonb(hour)
     and public.claim_run('water_reminder_' || hour, today) then
    cups := public.approved_cups('yoyo', today);
    expected := least(goal, greatest(0, floor(goal * (hour - pace_start)::numeric / (pace_end - pace_start))::int));
    if cups < expected then
      perform public.queue_push('yoyo', 'water_behind', jsonb_build_object('cups', cups, 'goal', goal), '/yoyo');
    end if;
  end if;

  if hour = public.rule_int('chores', 'reminderHour') and public.claim_run('chore_reminder', today) then
    for c in select * from public.chores loop
      left_days := public.chore_days_left(c);
      if left_days = 0 then
        perform public.queue_push('kyle', 'chore_due', jsonb_build_object('what', c.kind), '/kyle');
      elsif left_days < 0 then
        perform public.queue_push('kyle', 'chore_overdue', jsonb_build_object('what', c.kind, 'days', -left_days), '/kyle');
      end if;
    end loop;
  end if;
end $$;

-- Yoyo, goal already met: 「今天喝夠了」 closes the request without using a snooze.
create or replace function public.decline_water() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  rid uuid;
begin
  if public.my_role() is distinct from 'yoyo' then return jsonb_build_object('ok', false, 'error', 'not_yoyo'); end if;
  if public.approved_cups('yoyo', public.london_date()) < public.rule_int('water', 'dailyGoalYoyo') then
    return jsonb_build_object('ok', false, 'error', 'goal_not_met');
  end if;
  select id into rid from public.water_requests where resolved_at is null order by created_at desc limit 1 for update;
  if rid is null then return jsonb_build_object('ok', false, 'error', 'no_request'); end if;
  update public.water_requests set resolved_at = now() where id = rid;
  insert into public.bear_events (kind, payload) values ('water_declined', jsonb_build_object('request', rid));
  perform public.queue_push('kyle', 'water_declined', jsonb_build_object('who', 'yoyo'), '/yoyo');
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.decline_water() from public, anon;
grant execute on function public.decline_water() to authenticated;

-- Review: Yoyo's cups beyond the daily goal earn an extra bonus.
create or replace function public.review_water(p_log uuid, p_approve boolean) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me text := public.my_role();
  l public.water_logs;
  bonus int := 0;
begin
  if me is null then raise exception 'not a member'; end if;
  select * into l from public.water_logs where id = p_log for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if l.role = me then return jsonb_build_object('ok', false, 'error', 'own_log'); end if;
  if l.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'already'); end if;

  update public.water_logs
    set status = case when p_approve then 'approved' else 'rejected' end, reviewed_by = me, reviewed_at = now()
    where id = p_log;

  if p_approve then
    insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
    values (l.role, public.rule_int('coins', 'waterCupApproved'), 'water', 'water_logs', l.id::text);
    if l.role = 'yoyo' then
      update public.bear
        set water = public.clamp_stat(water + public.rule_int('bear', 'water', 'approvedCup')), updated_at = now()
        where id = 1;
      if public.approved_cups('yoyo', public.london_date(l.created_at)) > public.rule_int('water', 'dailyGoalYoyo') then
        bonus := public.rule_int('coins', 'extraCupBonus');
        insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
        values ('yoyo', bonus, 'water_bonus', 'water_logs', l.id::text);
      end if;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'bonus', bonus);
end $$;

-- Approval past the goal gets an encouraging notification.
create or replace function public.notify_water_log() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  partner text := case new.role when 'yoyo' then 'kyle' else 'yoyo' end;
  cups int;
  goal int := public.rule_int('water', 'dailyGoalYoyo');
begin
  if tg_op = 'INSERT' then
    perform public.queue_push(partner, 'water_submitted', jsonb_build_object('who', new.role), '/' || new.role);
  elsif old.status = 'pending' and new.status = 'approved' then
    cups := public.approved_cups(new.role, public.london_date(new.created_at));
    if new.role = 'yoyo' and cups > goal then
      perform public.queue_push(new.role, 'water_approved_extra',
        jsonb_build_object('who', new.reviewed_by, 'cups', cups, 'bonus', public.rule_int('coins', 'extraCupBonus')), '/' || new.role);
    else
      perform public.queue_push(new.role, 'water_approved', jsonb_build_object('who', new.reviewed_by), '/' || new.role);
    end if;
  elsif old.status = 'pending' and new.status = 'rejected' then
    perform public.queue_push(new.role, 'water_rejected', jsonb_build_object('who', new.reviewed_by), '/' || new.role);
  end if;
  return new;
end $$;

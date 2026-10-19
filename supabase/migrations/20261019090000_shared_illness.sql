-- Mood and energy are shared stats: if either falls too low the bear gets ill and the
-- treatment is split half/half between Yoyo and Kyle.

alter table public.bear alter column caused_by type text;
alter table public.bear add constraint bear_caused_by_check check (caused_by in ('yoyo', 'kyle', 'both'));

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
      "waterCupApproved": 5, "choreOnTime": 5, "handScorePlus": 2,
      "perfectStreak": 30, "perfectStreakDays": 7, "cookedWish": 10, "shoppingListCleared": 5
    },
    "water": {
      "dailyGoalYoyo": 8, "requestRepingMinutes": 30, "snoozeMinutes": 30, "maxSnoozesPerDay": 2,
      "photoRetentionDays": 14, "selfReminderHours": [10, 13, 16, 19], "paceStartHour": 8, "paceEndHour": 22
    },
    "chores": { "shaveIntervalDays": 3, "nailsIntervalDays": 9, "reminderHour": 9 },
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

-- Which stat a treatment restores.
create or replace function public.illness_stat(p_illness text) returns text
language sql immutable set search_path = ''
as $$
  select case p_illness
    when 'dehydration' then 'water'
    when 'blues' then 'mood'
    when 'exhausted' then 'energy'
    else 'clean' end
$$;

create or replace function public.cure_bear(p_kind text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bear;
  boost int := (public.game_rules()->'treatments'->p_kind->>'statBoost')::int;
begin
  select * into b from public.bear where id = 1 for update;
  if b.illness is null then return; end if;
  perform public.bump_stat(public.illness_stat(b.illness), boost);
  perform public.bump_stat('mood', (public.game_rules()->>'moodTreatment')::int);
  update public.bear
    set illness = null, severity = null, caused_by = null, ill_since = null, hospital_until = null, updated_at = now()
    where id = 1;
  insert into public.bear_events (kind, payload)
  values ('cured', jsonb_build_object('illness', b.illness, 'severity', b.severity, 'treatment', p_kind));
end $$;

create or replace function public.balance_of(p_role text) returns int
language sql stable security definer set search_path = ''
as $$ select coalesce(sum(amount), 0)::int from public.coin_ledger where role = p_role $$;

-- Pay for a treatment. One payer pays all; a shared ("both") illness costs half each,
-- either of them can press pay, and both balances must cover their half.
create or replace function public.treat_bear(p_kind text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me text := public.my_role();
  partner text;
  tr jsonb := public.game_rules()->'treatments'->p_kind;
  b public.bear;
  cost int;
  share int;
  my_short int;
  partner_short int;
  tid uuid;
begin
  if me is null then raise exception 'not a member'; end if;
  partner := case me when 'yoyo' then 'kyle' else 'yoyo' end;
  if tr is null then return jsonb_build_object('ok', false, 'error', 'bad_kind'); end if;

  select * into b from public.bear where id = 1 for update;
  if b.illness is null then return jsonb_build_object('ok', false, 'error', 'healthy'); end if;
  if b.hospital_until is not null then return jsonb_build_object('ok', false, 'error', 'waiting_bed'); end if;
  if b.caused_by <> 'both' and b.caused_by is distinct from me then return jsonb_build_object('ok', false, 'error', 'not_payer'); end if;
  if not (tr->'cures') ? b.severity then return jsonb_build_object('ok', false, 'error', 'not_curable'); end if;

  cost := (tr->>'cost')::int;
  if b.caused_by = 'both' then
    share := ceil(cost / 2.0)::int;
    my_short := greatest(0, share - public.balance_of(me));
    partner_short := greatest(0, share - public.balance_of(partner));
    if my_short > 0 or partner_short > 0 then
      return jsonb_build_object('ok', false, 'error', 'insufficient', 'missing', my_short, 'partner_missing', partner_short);
    end if;
    insert into public.treatments (kind, cost, paid_by) values (p_kind, cost, me) returning id into tid;
    insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
    values (me, -share, 'treatment', 'treatments', tid::text), (partner, -share, 'treatment', 'treatments', tid::text);
  else
    my_short := greatest(0, cost - public.balance_of(me));
    if my_short > 0 then return jsonb_build_object('ok', false, 'error', 'insufficient', 'missing', my_short); end if;
    insert into public.treatments (kind, cost, paid_by) values (p_kind, cost, me) returning id into tid;
    insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
    values (me, -cost, 'treatment', 'treatments', tid::text);
  end if;

  if (tr->>'waitHours')::int > 0 then
    update public.bear
      set hospital_until = now() + make_interval(hours => (tr->>'waitHours')::int), updated_at = now()
      where id = 1;
    insert into public.bear_events (kind, payload)
    values ('admitted', jsonb_build_object('illness', b.illness, 'paid_by', b.caused_by));
    return jsonb_build_object('ok', true, 'waiting', true, 'shared', b.caused_by = 'both');
  end if;

  perform public.cure_bear(p_kind);
  return jsonb_build_object('ok', true, 'waiting', false, 'shared', b.caused_by = 'both');
end $$;

-- Nobody to nudge when both pay.
create or replace function public.nudge_payer() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me text := public.my_role();
  payer text;
begin
  if me is null then raise exception 'not a member'; end if;
  select caused_by into payer from public.bear where id = 1;
  if payer is null or payer = me or payer = 'both' then return; end if;
  insert into public.bear_events (kind, payload) values ('nudge', jsonb_build_object('from', me, 'to', payer));
end $$;

-- Shared-stat checks run at the end of every day_end.
create or replace function public.check_shared_stats() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bear;
begin
  select * into b from public.bear where id = 1;
  if b.mood < public.rule_int('bear', 'mood', 'bluesBelow') then
    perform public.make_ill('blues', 'both');
  end if;
  if b.energy < public.rule_int('bear', 'energy', 'exhaustedBelow') then
    perform public.make_ill('exhausted', 'both');
  end if;
end $$;

create or replace function public.run_day_end(p_day date) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.day_end(p_day);
  perform public.check_shared_stats();
end $$;

-- run_rules now calls run_day_end (day_end + shared-stat checks).
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

  for r in select * from public.water_requests where resolved_at is null and next_ping_at <= now() for update loop
    update public.water_requests
      set next_ping_at = now() + make_interval(mins => public.rule_int('water', 'requestRepingMinutes')), snoozed_until = null
      where id = r.id;
    perform public.queue_push('yoyo', 'water_request', '{}', '/yoyo');
  end loop;

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

revoke execute on function public.illness_stat(text), public.balance_of(text), public.check_shared_stats(), public.run_day_end(date)
  from public, anon, authenticated;

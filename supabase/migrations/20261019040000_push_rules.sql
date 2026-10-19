-- YK Station · Milestone 6: push queue, event triggers, cron rules engine (SPEC §5, §7).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Rule set gains the pace window. KEEP IN SYNC with src/config/rules.ts.
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
      "mood": { "perIllDay": -5 },
      "energy": { "cooked": 10, "idleDay": -10 },
      "escalation": { "moderateAfterDays": 2, "severeAfterDays": 4 }
    },
    "treatments": {
      "medicine":  { "cost": 30,  "cures": ["mild"],                       "statBoost": 30, "waitHours": 0 },
      "injection": { "cost": 80,  "cures": ["mild", "moderate"],           "statBoost": 50, "waitHours": 0 },
      "hospital":  { "cost": 200, "cures": ["mild", "moderate", "severe"], "statBoost": 65, "waitHours": 2 }
    }
  }'::jsonb
$$;

-- ───────────── Config, queue, bookkeeping ─────────────
create table public.app_config (key text primary key, value text not null);
alter table public.app_config enable row level security;
create policy "members read config" on public.app_config for select to authenticated using (public.is_member());
revoke all on public.app_config from anon;

insert into public.app_config (key, value)
values ('push_url', 'https://kwoiygfabwkoubvzhape.supabase.co/functions/v1/push');

-- Notifications waiting to be sent. Text is rendered per recipient language by the Edge Function.
create table public.push_queue (
  id bigint generated always as identity primary key,
  to_role public.member_role not null,
  kind text not null,
  params jsonb not null default '{}',
  url text not null default '/',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);
alter table public.push_queue enable row level security;
revoke all on public.push_queue from anon, authenticated;

-- Which once-a-day jobs already ran for a London day.
create table public.rule_runs (job text not null, day date not null, ran_at timestamptz not null default now(), primary key (job, day));
alter table public.rule_runs enable row level security;
revoke all on public.rule_runs from anon, authenticated;

create table public.streaks (role public.member_role primary key, days int not null default 0, last_day date);
insert into public.streaks (role) values ('yoyo'), ('kyle');
alter table public.streaks enable row level security;
create policy "members read" on public.streaks for select to authenticated using (public.is_member());
revoke all on public.streaks from anon;

-- Shared secret between pg_net and the Edge Function. Generated here, never leaves the database
-- except inside the request header; the function checks it with check_cron_secret().
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'yk_cron_secret');

create or replace function public.check_cron_secret(p_secret text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from vault.decrypted_secrets where name = 'yk_cron_secret' and decrypted_secret = p_secret) $$;
revoke execute on function public.check_cron_secret(text) from public, anon, authenticated;
grant execute on function public.check_cron_secret(text) to service_role;

-- Ask the Edge Function to send whatever is queued (async HTTP via pg_net).
create or replace function public.kick_push() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  secret text;
  url text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'yk_cron_secret';
  select value into url from public.app_config where key = 'push_url';
  perform net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := '{}'::jsonb
  );
end $$;

create or replace function public.queue_push(p_to text, p_kind text, p_params jsonb default '{}', p_url text default '/') returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.push_queue (to_role, kind, params, url) values (p_to, p_kind, p_params, p_url);
end $$;

-- Statement-level: one HTTP call however many rows a statement queued.
create or replace function public.push_queue_kick() returns trigger
language plpgsql security definer set search_path = ''
as $$ begin perform public.kick_push(); return null; end $$;

create trigger push_queue_kick after insert on public.push_queue
  for each statement execute function public.push_queue_kick();

-- ───────────── Event → notification triggers ─────────────
create or replace function public.notify_water_log() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  partner text := case new.role when 'yoyo' then 'kyle' else 'yoyo' end;
begin
  if tg_op = 'INSERT' then
    perform public.queue_push(partner, 'water_submitted', jsonb_build_object('who', new.role), '/' || partner);
  elsif old.status = 'pending' and new.status = 'approved' then
    perform public.queue_push(new.role, 'water_approved', jsonb_build_object('who', new.reviewed_by), '/' || new.role);
  elsif old.status = 'pending' and new.status = 'rejected' then
    perform public.queue_push(new.role, 'water_rejected', jsonb_build_object('who', new.reviewed_by), '/' || new.role);
  end if;
  return new;
end $$;

create trigger notify_water_log after insert or update of status on public.water_logs
  for each row execute function public.notify_water_log();

create or replace function public.notify_hand_score() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.queue_push('kyle', case when new.delta > 0 then 'hand_plus' else 'hand_minus' end, '{}', '/kyle');
  return new;
end $$;

create trigger notify_hand_score after insert on public.hand_scores
  for each row execute function public.notify_hand_score();

create or replace function public.notify_bear_event() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.kind in ('fell_ill', 'severity_up') then
    perform public.queue_push('yoyo', new.kind, new.payload, '/');
    perform public.queue_push('kyle', new.kind, new.payload, '/');
  elsif new.kind = 'nudge' then
    perform public.queue_push(new.payload->>'to', 'nudge', new.payload, '/');
  end if;
  return new;
end $$;

create trigger notify_bear_event after insert on public.bear_events
  for each row execute function public.notify_bear_event();

-- 「叫又又喝水」 now notifies Yoyo immediately (new or repeated ask).
create or replace function public.request_water() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  rid uuid;
  existing boolean := false;
  reping int := public.rule_int('water', 'requestRepingMinutes');
begin
  if public.my_role() is distinct from 'kyle' then return jsonb_build_object('ok', false, 'error', 'not_kyle'); end if;
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

-- ───────────── Rules engine ─────────────
create or replace function public.approved_cups(p_role text, p_day date) returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.water_logs
  where role = p_role and status = 'approved' and public.london_date(created_at) = p_day
$$;

-- Runs a once-per-day job only the first time it is asked for that day.
create or replace function public.claim_run(p_job text, p_day date) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.rule_runs (job, day) values (p_job, p_day);
  return true;
exception when unique_violation then
  return false;
end $$;

-- End-of-day checks for London day p_day (run just after midnight).
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
  if cups < goal then
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

-- Called by pg_cron every 5 minutes.
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

  -- Yesterday's end-of-day checks, once.
  if public.claim_run('day_end', today - 1) then
    perform public.day_end(today - 1);
  end if;

  -- Re-ping open water requests every requestRepingMinutes (a snooze moves next_ping_at).
  for r in select * from public.water_requests where resolved_at is null and next_ping_at <= now() for update loop
    update public.water_requests
      set next_ping_at = now() + make_interval(mins => public.rule_int('water', 'requestRepingMinutes')), snoozed_until = null
      where id = r.id;
    perform public.queue_push('yoyo', 'water_request', '{}', '/yoyo');
  end loop;

  -- Yoyo's self-reminders if behind pace.
  if (public.game_rules()->'water'->'selfReminderHours') @> to_jsonb(hour)
     and public.claim_run('water_reminder_' || hour, today) then
    cups := public.approved_cups('yoyo', today);
    expected := least(goal, greatest(0, floor(goal * (hour - pace_start)::numeric / (pace_end - pace_start))::int));
    if cups < expected then
      perform public.queue_push('yoyo', 'water_behind', jsonb_build_object('cups', cups, 'goal', goal), '/yoyo');
    end if;
  end if;

  -- Kyle's chores: due day and every overdue day at reminderHour.
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

-- Mark today's day_end as done so the first run doesn't judge a day before the app existed.
insert into public.rule_runs (job, day) values ('day_end', public.london_date() - 1);

revoke execute on function public.kick_push(), public.queue_push(text, text, jsonb, text), public.approved_cups(text, date),
  public.claim_run(text, date), public.day_end(date), public.run_rules() from public, anon, authenticated;

select cron.schedule('yk-rules', '*/5 * * * *', $$select public.run_rules()$$);

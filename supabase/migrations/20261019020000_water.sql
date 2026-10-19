-- YK Station · Milestone 4: water photos, review, requests, snooze.

-- Full rule set for the server. KEEP IN SYNC with src/config/rules.ts.
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
      "photoRetentionDays": 14, "selfReminderHours": [10, 13, 16, 19]
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

create or replace function public.rule_int(variadic path text[]) returns int
language sql immutable set search_path = ''
as $$ select (public.game_rules() #>> path)::int $$;

-- "Today" for every daily rule is the London calendar day.
create or replace function public.london_date(ts timestamptz default now()) returns date
language sql stable set search_path = ''
as $$ select (ts at time zone (public.game_rules()->>'timeZone'))::date $$;

grant execute on function public.rule_int(text[]), public.london_date(timestamptz) to authenticated;

-- ───────────── Storage: private bucket, {role}/{log_id}/{full|empty}.jpg ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('water-photos', 'water-photos', false, 2097152, '{image/jpeg}')
on conflict (id) do nothing;

create policy "members upload own water photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'water-photos' and (storage.foldername(name))[1] = public.my_role());

create policy "members read water photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'water-photos' and public.is_member());

-- Logs must point at the uploader's own folder.
drop policy "log own water" on public.water_logs;
create policy "log own water" on public.water_logs
  for insert to authenticated
  with check (
    role = public.my_role() and status = 'pending' and reviewed_by is null
    and full_path like public.my_role() || '/%' and empty_path like public.my_role() || '/%'
  );

-- ───────────── Requests ─────────────
alter table public.water_requests add column snoozed_until timestamptz;

-- A cup from Yoyo answers any open request.
create or replace function public.resolve_water_requests() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role = 'yoyo' then
    update public.water_requests set resolved_at = now() where resolved_at is null;
  end if;
  return new;
end $$;

create trigger resolve_water_requests
  after insert on public.water_logs
  for each row execute function public.resolve_water_requests();

-- Kyle: 「叫又又喝水」. Reuses an open request instead of stacking them.
create or replace function public.request_water() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  rid uuid;
begin
  if public.my_role() is distinct from 'kyle' then return jsonb_build_object('ok', false, 'error', 'not_kyle'); end if;
  select id into rid from public.water_requests where resolved_at is null order by created_at desc limit 1;
  if rid is not null then
    -- Asking again re-opens the card right away.
    update public.water_requests set snoozed_until = null, next_ping_at = now() where id = rid;
    return jsonb_build_object('ok', true, 'id', rid, 'existing', true);
  end if;
  insert into public.water_requests (next_ping_at)
  values (now() + make_interval(mins => public.rule_int('water', 'requestRepingMinutes')))
  returning id into rid;
  return jsonb_build_object('ok', true, 'id', rid, 'existing', false);
end $$;

create or replace function public.snoozes_left() returns int
language sql stable security definer set search_path = ''
as $$
  select greatest(0, public.rule_int('water', 'maxSnoozesPerDay') - count(*)::int)
  from public.bear_events
  where kind = 'water_snooze' and public.london_date(created_at) = public.london_date()
$$;

-- Yoyo: 「我很飽，等等再喝」.
create or replace function public.snooze_water() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  rid uuid;
  mins int := public.rule_int('water', 'snoozeMinutes');
begin
  if public.my_role() is distinct from 'yoyo' then return jsonb_build_object('ok', false, 'error', 'not_yoyo'); end if;
  select id into rid from public.water_requests where resolved_at is null order by created_at desc limit 1 for update;
  if rid is null then return jsonb_build_object('ok', false, 'error', 'no_request'); end if;
  if public.snoozes_left() <= 0 then return jsonb_build_object('ok', false, 'error', 'no_snoozes'); end if;

  update public.water_requests
    set snoozes = snoozes + 1,
        snoozed_until = now() + make_interval(mins => mins),
        next_ping_at = now() + make_interval(mins => mins)
    where id = rid;
  insert into public.bear_events (kind, payload) values ('water_snooze', jsonb_build_object('request', rid));
  return jsonb_build_object('ok', true, 'left', public.snoozes_left());
end $$;

-- ───────────── Review ─────────────
create or replace function public.review_water(p_log uuid, p_approve boolean) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me text := public.my_role();
  l public.water_logs;
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
    -- Only Yoyo's water feeds the bear (SPEC §5).
    if l.role = 'yoyo' then
      update public.bear
        set water = public.clamp_stat(water + public.rule_int('bear', 'water', 'approvedCup')), updated_at = now()
        where id = 1;
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.request_water(), public.snoozes_left(), public.snooze_water(), public.review_water(uuid, boolean) from public, anon;
grant execute on function public.request_water(), public.snoozes_left(), public.snooze_water(), public.review_water(uuid, boolean) to authenticated;

alter publication supabase_realtime add table public.water_logs, public.water_requests;

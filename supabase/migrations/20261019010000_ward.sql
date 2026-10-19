-- YK Station · Milestone 3: treatments, curing, nudges, realtime for the ward.

-- Game numbers the server needs. KEEP IN SYNC with src/config/rules.ts.
create or replace function public.game_rules() returns jsonb
language sql immutable set search_path = ''
as $$
  select '{
    "statMin": 5,
    "statMax": 100,
    "moodTreatment": 15,
    "treatments": {
      "medicine":  { "cost": 30,  "cures": ["mild"],                       "statBoost": 30, "waitHours": 0 },
      "injection": { "cost": 80,  "cures": ["mild", "moderate"],           "statBoost": 50, "waitHours": 0 },
      "hospital":  { "cost": 200, "cures": ["mild", "moderate", "severe"], "statBoost": 65, "waitHours": 2 }
    }
  }'::jsonb
$$;

create or replace function public.clamp_stat(v int) returns int
language sql immutable set search_path = ''
as $$
  select least((public.game_rules()->>'statMax')::int, greatest((public.game_rules()->>'statMin')::int, v))
$$;

-- Internal: cure the bear with the given treatment's stat boost. Not callable from the app.
create or replace function public.cure_bear(p_kind text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bear;
  boost int := (public.game_rules()->'treatments'->p_kind->>'statBoost')::int;
  mood_up int := (public.game_rules()->>'moodTreatment')::int;
  stat text;
begin
  select * into b from public.bear where id = 1 for update;
  if b.illness is null then return; end if;
  -- Dehydration is a water problem; every other illness is a cleanliness one.
  stat := case when b.illness = 'dehydration' then 'water' else 'clean' end;

  update public.bear set
    water = case when stat = 'water' then public.clamp_stat(water + boost) else water end,
    clean = case when stat = 'clean' then public.clamp_stat(clean + boost) else clean end,
    mood = public.clamp_stat(mood + mood_up),
    illness = null, severity = null, caused_by = null, ill_since = null, hospital_until = null,
    updated_at = now()
  where id = 1;

  insert into public.bear_events (kind, payload)
  values ('cured', jsonb_build_object('illness', b.illness, 'severity', b.severity, 'treatment', p_kind));
end $$;

-- Pay for a treatment. Only the person who caused the illness can pay.
create or replace function public.treat_bear(p_kind text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me text := public.my_role();
  tr jsonb := public.game_rules()->'treatments'->p_kind;
  b public.bear;
  cost int;
  bal int;
  tid uuid;
begin
  if me is null then raise exception 'not a member'; end if;
  if tr is null then return jsonb_build_object('ok', false, 'error', 'bad_kind'); end if;

  select * into b from public.bear where id = 1 for update;
  if b.illness is null then return jsonb_build_object('ok', false, 'error', 'healthy'); end if;
  if b.hospital_until is not null then return jsonb_build_object('ok', false, 'error', 'waiting_bed'); end if;
  if b.caused_by is distinct from me then return jsonb_build_object('ok', false, 'error', 'not_payer'); end if;
  if not (tr->'cures') ? b.severity then return jsonb_build_object('ok', false, 'error', 'not_curable'); end if;

  cost := (tr->>'cost')::int;
  select coalesce(sum(amount), 0) into bal from public.coin_ledger where role = me;
  if bal < cost then
    return jsonb_build_object('ok', false, 'error', 'insufficient', 'missing', cost - bal);
  end if;

  insert into public.treatments (kind, cost, paid_by) values (p_kind, cost, me) returning id into tid;
  insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
  values (me, -cost, 'treatment', 'treatments', tid::text);

  if (tr->>'waitHours')::int > 0 then
    update public.bear
      set hospital_until = now() + make_interval(hours => (tr->>'waitHours')::int), updated_at = now()
      where id = 1;
    insert into public.bear_events (kind, payload)
    values ('admitted', jsonb_build_object('illness', b.illness, 'paid_by', me));
    return jsonb_build_object('ok', true, 'waiting', true);
  end if;

  perform public.cure_bear(p_kind);
  return jsonb_build_object('ok', true, 'waiting', false);
end $$;

-- Finish a hospital stay once the bed wait is over. Called when the ward opens (and by cron later).
create or replace function public.settle_bear() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.bear where id = 1 and hospital_until is not null and hospital_until <= now()) then
    perform public.cure_bear('hospital');
  end if;
end $$;

-- "Pay up!" nudge from the other person. Milestone 6 turns this event into a push.
create or replace function public.nudge_payer() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me text := public.my_role();
  payer text;
begin
  if me is null then raise exception 'not a member'; end if;
  select caused_by into payer from public.bear where id = 1;
  if payer is null or payer = me then return; end if;
  insert into public.bear_events (kind, payload) values ('nudge', jsonb_build_object('from', me, 'to', payer));
end $$;

revoke execute on function public.cure_bear(text) from public, anon, authenticated;
revoke execute on function public.treat_bear(text), public.settle_bear(), public.nudge_payer() from public, anon;
grant execute on function public.treat_bear(text), public.settle_bear(), public.nudge_payer() to authenticated;
grant execute on function public.game_rules(), public.clamp_stat(int) to authenticated;

-- Live updates on both phones.
alter publication supabase_realtime add table public.bear, public.coin_ledger, public.bear_events;

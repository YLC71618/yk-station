-- Calendar: one row per finished London day with whether each of them met their daily rules.
create table public.daily_results (
  day date primary key,
  yoyo_cups int not null,
  yoyo_ok boolean not null,
  kyle_ok boolean not null,
  created_at timestamptz not null default now()
);
alter table public.daily_results enable row level security;
create policy "members read" on public.daily_results for select to authenticated using (public.is_member());
revoke all on public.daily_results from anon;

-- Same definitions as the streak check in day_end: Yoyo = water goal; Kyle = no overdue chore
-- at the end of the day and no −1 hand score that day.
create or replace function public.record_day(p_day date) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  cups int := public.approved_cups('yoyo', p_day);
  kyle_ok boolean;
begin
  kyle_ok := not exists (select 1 from public.chores c where public.london_date(c.last_done_at) + c.interval_days < p_day)
    and not exists (select 1 from public.hand_scores where delta < 0 and public.london_date(created_at) = p_day);
  insert into public.daily_results (day, yoyo_cups, yoyo_ok, kyle_ok)
  values (p_day, cups, cups >= public.rule_int('water', 'dailyGoalYoyo'), kyle_ok)
  on conflict (day) do update set yoyo_cups = excluded.yoyo_cups, yoyo_ok = excluded.yoyo_ok, kyle_ok = excluded.kyle_ok;
end $$;

create or replace function public.run_day_end(p_day date) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.record_day(p_day);
  perform public.day_end(p_day);
  perform public.check_shared_stats();
end $$;

revoke execute on function public.record_day(date) from public, anon, authenticated;

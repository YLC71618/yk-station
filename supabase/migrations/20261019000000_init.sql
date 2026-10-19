-- YK Station · Milestone 1: schema, RLS, allowed_users gate, profiles (SPEC §3, §4)
-- Applied via SQL Editor before the CLI was set up. Emails are NOT in this file;
-- they live only in the allowed_users table.

-- ───────────────────────── Roles ─────────────────────────
create domain public.member_role as text check (value in ('yoyo', 'kyle'));

-- Only these two emails may sign up. No RLS policies → invisible to the API.
create table public.allowed_users (
  email text primary key check (email = lower(email)),
  role public.member_role not null unique
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.member_role not null unique,
  display_name text not null,
  lang text not null default 'zh-Hant' check (lang in ('zh-Hant', 'en-GB')),
  created_at timestamptz not null default now()
);

-- Role of the signed-in user, or null for anyone else. SECURITY DEFINER so
-- policies on profiles can call it without recursing into themselves.
create function public.my_role() returns text
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

create function public.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid()) $$;

-- Gate: refuse to create an auth user whose email is not allowed, so strangers
-- never get an account (and never get a code e-mailed).
create function public.gate_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.allowed_users a where a.email = lower(new.email)) then
    raise exception 'YK_NOT_ALLOWED';
  end if;
  return new;
end $$;

create trigger gate_new_user
  before insert on auth.users
  for each row execute function public.gate_new_user();

-- After the account exists, create the matching profile.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare r text;
begin
  select a.role into r from public.allowed_users a where a.email = lower(new.email);
  if r is not null then
    insert into public.profiles (id, role, display_name)
    values (new.id, r, case r when 'yoyo' then '又又' else '鍇鍇' end)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

create trigger handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Tables ─────────────────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  role public.member_role not null,
  amount int not null,
  reason text not null,
  ref_table text,
  ref_id text,
  created_at timestamptz not null default now()
);
create index coin_ledger_role_idx on public.coin_ledger (role);

create view public.coin_balances with (security_invoker = true) as
  select role, coalesce(sum(amount), 0)::int as balance
  from public.coin_ledger
  group by role;

create table public.bear (
  id int primary key default 1 check (id = 1),
  water int not null default 100 check (water between 0 and 100),
  clean int not null default 100 check (clean between 0 and 100),
  mood int not null default 100 check (mood between 0 and 100),
  energy int not null default 100 check (energy between 0 and 100),
  illness text,
  severity text check (severity in ('mild', 'moderate', 'severe')),
  caused_by public.member_role,
  ill_since timestamptz,
  hospital_until timestamptz,
  admitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bear_events (
  id bigint generated always as identity primary key,
  kind text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  role public.member_role not null default public.my_role(),
  full_path text,
  empty_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by public.member_role,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (reviewed_by is null or reviewed_by <> role)
);
create index water_logs_created_idx on public.water_logs (created_at desc);

create table public.water_requests (
  id uuid primary key default gen_random_uuid(),
  from_role public.member_role not null default 'kyle' check (from_role = 'kyle'),
  to_role public.member_role not null default 'yoyo' check (to_role = 'yoyo'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  next_ping_at timestamptz,
  snoozes int not null default 0
);

create table public.hand_scores (
  id uuid primary key default gen_random_uuid(),
  delta int not null check (delta in (1, -1)),
  created_by public.member_role not null default 'yoyo' check (created_by = 'yoyo'),
  created_at timestamptz not null default now()
);

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  owner public.member_role not null default 'kyle' check (owner = 'kyle'),
  kind text not null unique check (kind in ('shave', 'nails')),
  interval_days int not null check (interval_days > 0),
  last_done_at timestamptz not null default now()
);

create table public.food_wishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  who public.member_role not null,
  source_index int not null default 0,
  cooked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.wheel_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list text not null check (list in ('grocery', 'stuff')),
  name text not null,
  added_by public.member_role not null default public.my_role(),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('medicine', 'injection', 'hospital')),
  cost int not null,
  paid_by public.member_role not null,
  created_at timestamptz not null default now()
);

create table public.user_task_defs (
  id uuid primary key default gen_random_uuid(),
  owner public.member_role not null default public.my_role(),
  title text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Seed ─────────────────────────
-- Intervals mirror src/config/rules.ts (chores.shaveIntervalDays / nailsIntervalDays).
insert into public.bear (id) values (1);
insert into public.chores (kind, interval_days) values ('shave', 3), ('nails', 9);

-- ───────────────────────── Privileges ─────────────────────────
-- Signed-out visitors (anon) get nothing at all.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.my_role(), public.is_member() to authenticated;
alter default privileges in schema public revoke all on tables from anon;

-- Profiles: you may only change your own name and language, never your role.
revoke update on public.profiles from authenticated;
grant update (display_name, lang) on public.profiles to authenticated;

-- ───────────────────────── RLS ─────────────────────────
alter table public.allowed_users      enable row level security;
alter table public.profiles           enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.coin_ledger        enable row level security;
alter table public.bear               enable row level security;
alter table public.bear_events        enable row level security;
alter table public.water_logs         enable row level security;
alter table public.water_requests     enable row level security;
alter table public.hand_scores        enable row level security;
alter table public.chores             enable row level security;
alter table public.food_wishes        enable row level security;
alter table public.wheel_options      enable row level security;
alter table public.shopping_items     enable row level security;
alter table public.treatments         enable row level security;
alter table public.user_task_defs     enable row level security;

-- Shared data: both members can read everything below.
create policy "members read" on public.profiles       for select to authenticated using (public.is_member());
create policy "members read" on public.coin_ledger    for select to authenticated using (public.is_member());
create policy "members read" on public.bear           for select to authenticated using (public.is_member());
create policy "members read" on public.bear_events    for select to authenticated using (public.is_member());
create policy "members read" on public.water_logs     for select to authenticated using (public.is_member());
create policy "members read" on public.water_requests for select to authenticated using (public.is_member());
create policy "members read" on public.hand_scores    for select to authenticated using (public.is_member());
create policy "members read" on public.chores         for select to authenticated using (public.is_member());
create policy "members read" on public.treatments     for select to authenticated using (public.is_member());
create policy "members read" on public.user_task_defs for select to authenticated using (public.is_member());

-- Coins, bear stats, chores and treatments change only through server-side
-- functions added in later milestones (no client insert/update policies here),
-- so nobody can give themselves coins from the browser console.

create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own push subs" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Water: you log only your own cups, always starting as pending.
create policy "log own water" on public.water_logs
  for insert to authenticated with check (role = public.my_role() and status = 'pending' and reviewed_by is null);

create policy "kyle asks yoyo" on public.water_requests
  for insert to authenticated with check (public.my_role() = 'kyle');

create policy "only yoyo scores hands" on public.hand_scores
  for insert to authenticated with check (public.my_role() = 'yoyo');

-- Freely shared lists.
create policy "members all" on public.food_wishes
  for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members all" on public.wheel_options
  for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members read" on public.shopping_items
  for select to authenticated using (public.is_member());
create policy "members add" on public.shopping_items
  for insert to authenticated with check (added_by = public.my_role());
create policy "members change" on public.shopping_items
  for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "members delete" on public.shopping_items
  for delete to authenticated using (public.is_member());

create policy "own tasks write" on public.user_task_defs
  for all to authenticated using (owner = public.my_role()) with check (owner = public.my_role());

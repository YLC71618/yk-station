-- Feedback from the first iPhone test.

-- Chores can only be ticked off once they are due (once per interval). Coins on the due day;
-- overdue still resets the countdown but pays nothing.
create or replace function public.complete_chore(p_kind text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.chores;
  left_days int;
  on_time boolean;
  earned int := 0;
begin
  if public.my_role() is distinct from 'kyle' then return jsonb_build_object('ok', false, 'error', 'not_kyle'); end if;
  select * into c from public.chores where kind = p_kind for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'bad_kind'); end if;

  left_days := public.chore_days_left(c);
  if left_days > 0 then return jsonb_build_object('ok', false, 'error', 'not_due', 'days', left_days); end if;

  on_time := left_days = 0;
  if on_time then
    earned := public.rule_int('coins', 'choreOnTime');
    insert into public.coin_ledger (role, amount, reason, ref_table, ref_id)
    values ('kyle', earned, 'chore_' || p_kind, 'chores', c.id::text);
  end if;
  update public.chores set last_done_at = now() where id = c.id;
  insert into public.bear_events (kind, payload) values ('chore_done', jsonb_build_object('kind', p_kind, 'on_time', on_time));
  return jsonb_build_object('ok', true, 'on_time', on_time, 'earned', earned);
end $$;

-- Water reviews now live on the drinker's own tab, so notifications open that tab.
create or replace function public.notify_water_log() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  partner text := case new.role when 'yoyo' then 'kyle' else 'yoyo' end;
begin
  if tg_op = 'INSERT' then
    perform public.queue_push(partner, 'water_submitted', jsonb_build_object('who', new.role), '/' || new.role);
  elsif old.status = 'pending' and new.status = 'approved' then
    perform public.queue_push(new.role, 'water_approved', jsonb_build_object('who', new.reviewed_by), '/' || new.role);
  elsif old.status = 'pending' and new.status = 'rejected' then
    perform public.queue_push(new.role, 'water_rejected', jsonb_build_object('who', new.reviewed_by), '/' || new.role);
  end if;
  return new;
end $$;

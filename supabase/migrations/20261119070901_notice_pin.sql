alter table public.worker_notices
  add column if not exists pinned boolean not null default false;

alter table public.worker_notices
  add column if not exists pinned_at timestamptz;

alter table public.worker_notices
  drop constraint if exists worker_notices_pinned_at_check;

alter table public.worker_notices
  add constraint worker_notices_pinned_at_check check (
    (pinned and pinned_at is not null)
    or (not pinned and pinned_at is null)
  );

create or replace function public.guard_worker_notice_pin()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  actor_can_post boolean;
  pinned_count integer;
begin
  if tg_op = 'UPDATE' and session_user not in ('postgres', 'supabase_admin') then
    select exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    ) into actor_can_post;
    if not actor_can_post then
      raise exception 'notice_forbidden';
    end if;
    if (to_jsonb(new) - 'pinned' - 'pinned_at')
      is distinct from (to_jsonb(old) - 'pinned' - 'pinned_at') then
      raise exception 'notice_forbidden';
    end if;
  end if;

  new.pinned := coalesce(new.pinned, false);

  if new.pinned and tg_op = 'UPDATE' and old.pinned then
    new.pinned_at := old.pinned_at;
    return new;
  end if;

  if not new.pinned then
    new.pinned_at := null;
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('public.worker_notices.pin'));

  select count(*)::integer
    into pinned_count
  from public.worker_notices
  where pinned
    and id is distinct from new.id;

  if pinned_count >= 5 then
    raise exception 'notice_pin_limit';
  end if;

  new.pinned_at := now();
  return new;
end;
$$;

drop trigger if exists worker_notices_pin_guard on public.worker_notices;
create trigger worker_notices_pin_guard
  before insert or update on public.worker_notices
  for each row
  execute function public.guard_worker_notice_pin();

grant update on public.worker_notices to authenticated;

drop policy if exists worker_notices_update on public.worker_notices;
create policy worker_notices_update
  on public.worker_notices
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    )
  );

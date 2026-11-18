create table if not exists public.worker_notices (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint worker_notices_body_check check (char_length(btrim(body)) > 0)
);

create index if not exists worker_notices_created_idx
  on public.worker_notices (created_at desc);

create table if not exists public.worker_notice_checks (
  notice_id uuid not null references public.worker_notices (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);

alter table public.worker_notices enable row level security;
alter table public.worker_notice_checks enable row level security;

revoke all on public.worker_notices from anon;
revoke all on public.worker_notice_checks from anon;
grant select, insert, delete on public.worker_notices to authenticated;
grant select, insert on public.worker_notice_checks to authenticated;

create or replace function public.guard_worker_notice_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  actor_can_post boolean;
begin
  if tg_op = 'DELETE' then
    if session_user in ('postgres', 'supabase_admin') then
      return old;
    end if;
    select exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    ) into actor_can_post;
    if not actor_can_post then
      raise exception 'notice_forbidden';
    end if;
    return old;
  end if;

  new.body := nullif(btrim(coalesce(new.body, '')), '');
  if new.body is null then
    raise exception 'notice_forbidden';
  end if;

  if session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('super_admin', 'admin', '관리자')
  ) into actor_can_post;

  if not actor_can_post then
    raise exception 'notice_forbidden';
  end if;

  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists worker_notices_guard on public.worker_notices;
create trigger worker_notices_guard
  before insert or delete on public.worker_notices
  for each row
  execute function public.guard_worker_notice_write();

create or replace function public.guard_worker_notice_check_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if session_user in ('postgres', 'supabase_admin') then
    new.checked_at := coalesce(new.checked_at, now());
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = '작업자'
      and activate is distinct from false
  ) then
    raise exception 'notice_forbidden';
  end if;

  new.user_id := auth.uid();
  new.checked_at := now();
  return new;
end;
$$;

drop trigger if exists worker_notice_checks_guard on public.worker_notice_checks;
create trigger worker_notice_checks_guard
  before insert on public.worker_notice_checks
  for each row
  execute function public.guard_worker_notice_check_write();

drop policy if exists worker_notices_select on public.worker_notices;
create policy worker_notices_select
  on public.worker_notices
  for select
  to authenticated
  using (true);

drop policy if exists worker_notices_insert on public.worker_notices;
create policy worker_notices_insert
  on public.worker_notices
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists worker_notices_delete on public.worker_notices;
create policy worker_notices_delete
  on public.worker_notices
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    )
  );

drop policy if exists worker_notice_checks_select on public.worker_notice_checks;
create policy worker_notice_checks_select
  on public.worker_notice_checks
  for select
  to authenticated
  using (true);

drop policy if exists worker_notice_checks_insert on public.worker_notice_checks;
create policy worker_notice_checks_insert
  on public.worker_notice_checks
  for insert
  to authenticated
  with check (user_id = auth.uid());

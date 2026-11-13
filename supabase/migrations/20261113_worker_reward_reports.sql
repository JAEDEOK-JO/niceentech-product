create table if not exists public.worker_reward_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  photo_path text not null check (length(btrim(photo_path)) > 0),
  status text not null default '대기' check (status in ('대기', '승인', '반려')),
  amount integer not null default 2000 check (amount = 2000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id)
);

create index if not exists worker_reward_reports_user_created_idx
  on public.worker_reward_reports (user_id, created_at desc);

create index if not exists worker_reward_reports_pending_idx
  on public.worker_reward_reports (created_at)
  where status = '대기';

alter table public.worker_reward_reports enable row level security;

revoke all on public.worker_reward_reports from anon;
grant select, insert, update on public.worker_reward_reports to authenticated;

create or replace function public.guard_worker_reward_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  actor_is_admin boolean;
begin
  if tg_op = 'INSERT' then
    if session_user in ('postgres', 'supabase_admin') then
      new.amount := 2000;
      if new.status is null or new.status not in ('대기', '승인', '반려') then
        new.status := '대기';
      end if;
      return new;
    end if;

    new.user_id := auth.uid();
    new.status := '대기';
    new.amount := 2000;
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.photo_path is distinct from old.photo_path
     or new.amount is distinct from old.amount
     or new.created_at is distinct from old.created_at then
    raise exception 'reward_forbidden';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('super_admin', 'admin', '관리자')
  )
  into actor_is_admin;

  if not actor_is_admin or new.status not in ('승인', '반려') then
    raise exception 'reward_forbidden';
  end if;

  new.reviewed_at := now();
  new.reviewed_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists worker_reward_reports_guard on public.worker_reward_reports;
create trigger worker_reward_reports_guard
  before insert or update on public.worker_reward_reports
  for each row
  execute function public.guard_worker_reward_write();

drop policy if exists worker_reward_reports_select on public.worker_reward_reports;
create policy worker_reward_reports_select
  on public.worker_reward_reports
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    )
  );

drop policy if exists worker_reward_reports_insert on public.worker_reward_reports;
create policy worker_reward_reports_insert
  on public.worker_reward_reports
  for insert
  to authenticated
  with check (user_id = auth.uid() and status = '대기' and amount = 2000);

drop policy if exists worker_reward_reports_update on public.worker_reward_reports;
create policy worker_reward_reports_update
  on public.worker_reward_reports
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-rewards',
  'worker-rewards',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists worker_rewards_select on storage.objects;
create policy worker_rewards_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'worker-rewards'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role::text in ('super_admin', 'admin', '관리자')
      )
    )
  );

drop policy if exists worker_rewards_insert on storage.objects;
create policy worker_rewards_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'worker-rewards'
    and (storage.foldername(name))[1] = auth.uid()::text
    and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists worker_rewards_delete on storage.objects;
create policy worker_rewards_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'worker-rewards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.user_capability_grants (
  user_id uuid not null references public.profiles(id) on delete cascade,
  capability text not null,
  detail text not null default '',
  primary key (user_id, capability, detail),
  constraint user_capability_grants_capability_check check (
    capability in (
      'reward_review_denied',
      'attendance_dept_head',
      'attendance_gyeongyu',
      'attendance_final',
      'welding_schedule',
      'department_desk',
      'attendance_scope'
    )
  )
);

alter table public.user_capability_grants enable row level security;

drop policy if exists user_capability_grants_select on public.user_capability_grants;
create policy user_capability_grants_select
  on public.user_capability_grants
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text = 'super_admin'
    )
  );

drop policy if exists user_capability_grants_insert on public.user_capability_grants;
create policy user_capability_grants_insert
  on public.user_capability_grants
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text = 'super_admin'
    )
  );

drop policy if exists user_capability_grants_delete on public.user_capability_grants;
create policy user_capability_grants_delete
  on public.user_capability_grants
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text = 'super_admin'
    )
  );

grant select, insert, delete on public.user_capability_grants to authenticated;

insert into public.user_capability_grants (user_id, capability, detail)
select id, 'reward_review_denied', ''
from public.profiles
where replace(coalesce(name, ''), ' ', '') in ('생산부', '용접부', '나사부')
on conflict do nothing;

insert into public.user_capability_grants (user_id, capability, detail)
select id, 'department_desk', ''
from public.profiles
where replace(coalesce(name, ''), ' ', '') in ('생산부', '용접부', '나사부')
on conflict do nothing;

insert into public.user_capability_grants (user_id, capability, detail)
select id, 'attendance_dept_head', ''
from public.profiles
where replace(coalesce(name, ''), ' ', '') = '조재덕'
on conflict do nothing;

insert into public.user_capability_grants (user_id, capability, detail)
select id, 'attendance_gyeongyu', ''
from public.profiles
where replace(coalesce(name, ''), ' ', '') in ('조재덕', '이지형')
on conflict do nothing;

insert into public.user_capability_grants (user_id, capability, detail)
select id, 'attendance_final', ''
from public.profiles
where replace(coalesce(name, ''), ' ', '') in ('조재덕', '이용필')
on conflict do nothing;

insert into public.user_capability_grants (user_id, capability, detail)
select id, 'welding_schedule', ''
from public.profiles
where replace(coalesce(name, ''), ' ', '') in ('안상기', '김호연')
on conflict do nothing;

insert into public.user_capability_grants (user_id, capability, detail)
select profile.id, 'attendance_scope', scope.department
from public.profiles as profile
join (
  values
    ('용접부', '용접부'),
    ('용접부', 'CNC'),
    ('용접반', '용접부'),
    ('용접반', 'CNC'),
    ('메인관', '생산부'),
    ('가지관', '생산부'),
    ('생산부', '생산부'),
    ('나사부', '나사부')
) as scope(account_name, department)
  on replace(coalesce(profile.name, ''), ' ', '') = scope.account_name
on conflict do nothing;

create or replace function public.can_review_worker_reward(actor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = actor
      and role::text in ('super_admin', 'admin', '관리자')
  )
  and not exists (
    select 1
    from public.user_capability_grants
    where user_id = actor
      and capability = 'reward_review_denied'
  );
$$;

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
    if new.photo_paths is null and new.photo_path is not null then
      new.photo_paths := array[new.photo_path];
    end if;
    if new.photo_paths is not null and cardinality(new.photo_paths) = 0 then
      new.photo_paths := null;
    end if;
    if new.normal_photo_paths is not null and cardinality(new.normal_photo_paths) = 0 then
      new.normal_photo_paths := null;
    end if;
    new.original_note := nullif(btrim(coalesce(new.original_note, '')), '');
    new.found_note := nullif(btrim(coalesce(new.found_note, '')), '');
    new.photo_path := case
      when new.photo_paths is null then null
      else new.photo_paths[1]
    end;

    if session_user in ('postgres', 'supabase_admin') then
      new.amount := 2000;
      if new.status is null or new.status not in ('대기', '승인', '반려') then
        new.status := '대기';
      end if;
      return new;
    end if;

    if new.found_note is null
       or (new.photo_paths is not null and cardinality(new.photo_paths) > 3)
       or (new.normal_photo_paths is not null and cardinality(new.normal_photo_paths) > 3) then
      raise exception 'reward_forbidden';
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
     or new.photo_paths is distinct from old.photo_paths
     or new.normal_photo_paths is distinct from old.normal_photo_paths
     or new.original_note is distinct from old.original_note
     or new.found_note is distinct from old.found_note
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

  select public.can_review_worker_reward(auth.uid()) into actor_is_admin;

  if not actor_is_admin or new.status not in ('승인', '반려') then
    raise exception 'reward_forbidden';
  end if;

  new.reviewed_at := now();
  new.reviewed_by := auth.uid();
  return new;
end;
$$;

drop policy if exists worker_reward_reports_update on public.worker_reward_reports;
create policy worker_reward_reports_update
  on public.worker_reward_reports
  for update
  to authenticated
  using (public.can_review_worker_reward(auth.uid()))
  with check (public.can_review_worker_reward(auth.uid()));

create or replace function public.can_manage_welding_schedule(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = user_id
      and profile.role::text in ('super_admin', 'admin')
  )
  or exists (
    select 1
    from public.user_capability_grants as grant_row
    where grant_row.user_id = can_manage_welding_schedule.user_id
      and grant_row.capability = 'welding_schedule'
  );
$$;

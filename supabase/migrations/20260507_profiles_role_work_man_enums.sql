do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'profile_role'
  ) then
    create type public.profile_role as enum ('admin', '관리자', '작업반장', '일반', '외주');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'profile_work_man'
  ) then
    create type public.profile_work_man as enum (
      '없음',
      '관리자',
      '작업반장',
      '전체',
      '마킹1',
      '마킹2',
      '레이저1',
      '레이저2',
      '무용접',
      '무용접반',
      '나사',
      '티&면치',
      '메인',
      '용접',
      '용접반',
      '진민택',
      '민뚜라'
    );
  end if;
end $$;

update public.profiles
set work_man = '작업반장'
where role::text = '현장관리자'
  or work_man::text = '현장관리자';

update public.profiles
set role = '작업반장'
where role::text = '현장관리자';

drop index if exists public.idx_profiles_role;

alter table public.profiles
  alter column role drop default,
  alter column role type public.profile_role
    using coalesce(nullif(role::text, ''), '일반')::public.profile_role,
  alter column role set default '일반';

alter table public.profiles
  alter column work_man drop default,
  alter column work_man type public.profile_work_man
    using coalesce(nullif(work_man::text, ''), '없음')::public.profile_work_man,
  alter column work_man set default '없음';

create index if not exists idx_profiles_role
  on public.profiles (role);

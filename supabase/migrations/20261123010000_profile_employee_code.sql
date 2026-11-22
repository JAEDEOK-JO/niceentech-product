alter table public.profiles
  add column if not exists employee_code text;

create unique index if not exists profiles_employee_code_key
  on public.profiles (employee_code)
  where employee_code is not null;

comment on column public.profiles.employee_code is '출퇴근 기계 사번';

with employee_codes as (
  select employee_code,
         lower(regexp_replace(btrim(name), '\s+', '', 'g')) as name_key
  from public.employees
  where employee_code is not null
    and btrim(employee_code) <> ''
),
unique_codes as (
  select employee_code, min(name_key) as name_key
  from employee_codes
  group by employee_code
  having count(*) = 1
),
worker_matches as (
  select p.id, u.employee_code
  from public.profiles p
  join unique_codes u
    on lower(regexp_replace(btrim(p.name), '\s+', '', 'g')) = u.name_key
  where p.role = '작업자'
),
single_worker as (
  select employee_code, min(id::text) as id
  from worker_matches
  group by employee_code
  having count(*) = 1
)
update public.profiles p
set employee_code = s.employee_code
from single_worker s
where p.id::text = s.id
  and p.employee_code is null;

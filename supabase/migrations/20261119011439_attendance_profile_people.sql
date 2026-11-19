alter table public.daily_work_hours
  add column if not exists profile_id uuid references public.profiles (id);

alter table public.daily_work_hours
  alter column employee_id drop not null;

create unique index if not exists daily_work_hours_work_date_profile_id_key
  on public.daily_work_hours (work_date, profile_id);

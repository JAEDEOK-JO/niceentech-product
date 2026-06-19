create or replace function public.can_manage_welding_schedule(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and (
        p.role::text = 'admin'
        or trim(coalesce(p.name, '')) in ('안상기', '김호연')
      )
  );
$$;

create or replace function public.enforce_welding_schedule_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.welding_schedule_date is distinct from old.welding_schedule_date)
     or (new.welding_schedule_inspector is distinct from old.welding_schedule_inspector) then
    if not public.can_manage_welding_schedule(auth.uid()) then
      raise exception '용접일정 수정 권한이 없습니다.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_welding_schedule_permission on public.product_list;

create trigger enforce_welding_schedule_permission
before update on public.product_list
for each row
execute function public.enforce_welding_schedule_permission();

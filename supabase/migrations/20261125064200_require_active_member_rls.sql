set local lock_timeout = '5s';

create function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.activate is true
  )
$fn$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.activate is true
      and p.role::text in ('super_admin', 'admin', '관리자')
  )
$fn$;

revoke execute on function public.is_active_member(), public.is_admin() from public, anon;
grant execute on function public.is_active_member(), public.is_admin() to authenticated, service_role;

create function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated')
     and (new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.activate is distinct from old.activate)
     and not public.is_admin() then
    raise exception 'profile_privilege_forbidden' using errcode = '42501';
  end if;
  return new;
end
$fn$;

revoke execute on function public.guard_profile_privileges() from public, anon, authenticated;

create trigger profiles_guard_privileges
before update on public.profiles
for each row execute function public.guard_profile_privileges();

do $do$
declare t text;
begin
  foreach t in array array[
    'attendance_annual_quota', 'attendance_logs', 'attendance_requests', 'chat_room_members',
    'company_fitting_types', 'company_list', 'company_pipe_types', 'department_metric_definitions',
    'department_metric_entries', 'device_tokens', 'drawing_pdf', 'drawing_telegram_notifications',
    'employees', 'fitting_types', 'inventory_transactions_fitting', 'inventory_transactions_pipe',
    'issued_transaction_statements', 'notifications', 'outsourcing_company', 'outsourcing_management',
    'pipe_types', 'process_issue_request_feedbacks', 'process_issue_request_notifications',
    'process_issue_requests', 'product_list', 'product_list_daily_heads',
    'product_list_daily_process_heads', 'product_list_process_time_calcs', 'product_list_test',
    'product_list_time_calcs', 'production_line_overtime_logs', 'production_overtime_logs',
    'production_repair_history', 'productlist_checks', 'quality_list', 'quality_list_info',
    'sales_as_entries', 'sales_weekly_entries', 'setting_updates', 'shipment_schedule',
    'time_calc_settings', 'unit_price_ranges', 'welding_inspections', 'welding_issues'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy active_member_all on public.%I for all to authenticated '
      || 'using ((select public.is_active_member())) with check ((select public.is_active_member()))', t);
  end loop;

  foreach t in array array[
    'attendance_request_notifications', 'chat_messages', 'chat_room_reads', 'chat_rooms',
    'chat_scheduled_messages', 'chatbot_conversations', 'chatbot_messages', 'chatbot_notes',
    'chatbot_runs', 'daily_work_hours', 'drawing_file_history', 'drawing_quantity_runs',
    'drawing_quantity_tasks', 'employee_option_settings', 'fcm_tokens',
    'inventory_company_material_items', 'inventory_material_items',
    'inventory_quantity_sheet_columns', 'inventory_quantity_sheet_items',
    'inventory_quantity_sheets', 'inventory_transaction_items', 'inventory_transactions',
    'maker_catalog', 'push_recipient_settings', 'quality_merge_backups', 'user_capability_grants',
    'worker_notice_checks', 'worker_notices', 'worker_reward_reports'
  ] loop
    execute format(
      'create policy active_member_only on public.%I as restrictive for all to authenticated '
      || 'using ((select public.is_active_member())) with check ((select public.is_active_member()))', t);
  end loop;
end
$do$;

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_active_member()));

create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check ((select public.is_admin()));

create policy profiles_update_member on public.profiles
  for update to authenticated
  using ((select public.is_active_member()))
  with check ((select public.is_active_member()));

create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using ((select public.is_admin()));

create policy active_member_update on public.setting
  as restrictive for update to authenticated
  using ((select public.is_active_member()))
  with check ((select public.is_active_member()));

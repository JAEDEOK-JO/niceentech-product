set local lock_timeout = '5s';

revoke execute on function
  public.list_chat_production_work_board(uuid, text, integer, integer),
  public.confirm_chat_production_request(uuid, text, text, text, timestamp with time zone),
  public.process_chat_scheduled_messages(integer),
  public.upsert_device_token(text, text),
  public.is_push_settings_admin(),
  public.can_manage_welding_schedule(uuid),
  public.can_review_worker_reward(uuid)
from public, anon;

grant execute on function
  public.list_chat_production_work_board(uuid, text, integer, integer),
  public.confirm_chat_production_request(uuid, text, text, text, timestamp with time zone),
  public.process_chat_scheduled_messages(integer),
  public.upsert_device_token(text, text),
  public.is_push_settings_admin(),
  public.can_manage_welding_schedule(uuid),
  public.can_review_worker_reward(uuid)
to authenticated, service_role;

revoke execute on function
  public.process_drawing_telegram_notification(bigint),
  public.retry_failed_drawing_telegram_notifications(integer),
  public.reset_annual_leave_on_anniversary()
from public, anon, authenticated;

alter table public.shipment_schedule disable trigger shipment_schedule_notify;

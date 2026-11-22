-- 도면배포/취소는 기록만 남기고 FCM은 보내지 않는다.
CREATE OR REPLACE FUNCTION public.process_drawing_telegram_notification(p_notification_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_row public.drawing_telegram_notifications%ROWTYPE;
BEGIN
  SELECT *
    INTO target_row
  FROM public.drawing_telegram_notifications
  WHERE id = p_notification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF target_row.delivery_status IN ('sent', 'skipped') THEN
    RETURN;
  END IF;

  UPDATE public.drawing_telegram_notifications
  SET delivery_status = 'skipped',
      skip_reason = 'drawing_push_disabled',
      last_error = null,
      response_status_code = null,
      response_body = null,
      sent_at = null,
      attempt_count = attempt_count + 1,
      updated_at = now()
  WHERE id = p_notification_id;
END;
$$;

UPDATE public.drawing_telegram_notifications
SET delivery_status = 'skipped',
    skip_reason = 'drawing_push_disabled',
    updated_at = now()
WHERE delivery_status IN ('queued', 'failed');

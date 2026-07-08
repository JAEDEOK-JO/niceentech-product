-- 근태 승인 단계별 알림 (신청→조재덕, 부서장승인→이지형, 경유→이용필, 최종→신청자)

CREATE OR REPLACE FUNCTION public.get_profile_id_by_name(p_name text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.name = p_name
    AND coalesce(p.activate, true) = true
  ORDER BY u.last_sign_in_at DESC NULLS LAST, p.id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_profile_id_by_name(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_attendance_workflow_notification(
  p_request_id bigint,
  p_recipient_user_id uuid,
  p_title text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_recipient_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.attendance_request_notifications (
    attendance_request_id,
    recipient_user_id,
    title,
    message
  ) VALUES (
    p_request_id,
    p_recipient_user_id,
    p_title,
    p_message
  )
  ON CONFLICT (attendance_request_id, recipient_user_id) DO UPDATE
  SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    is_read = false,
    read_at = null,
    created_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_attendance_workflow_notification(bigint, uuid, text, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_admins_on_attendance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_title text;
  v_message text;
  v_start text;
BEGIN
  v_start := to_char(NEW.start_date::date, 'YYYY-MM-DD');
  v_title := '[휴가 신청] ' || coalesce(NEW.user_name, '');
  v_message := coalesce(NEW.department, '')
    || ' · ' || coalesce(NEW.leave_type, '')
    || ' ' || coalesce(NEW.days_count::text, '') || '일'
    || ' · ' || v_start;

  IF coalesce(NEW.reason, '') <> '' THEN
    v_message := v_message || ' · ' || NEW.reason;
  END IF;

  v_recipient_id := public.get_profile_id_by_name('조재덕');

  IF v_recipient_id IS NOT NULL THEN
    PERFORM public.upsert_attendance_workflow_notification(
      NEW.id,
      v_recipient_id,
      v_title,
      v_message
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_attendance_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_message text;
  v_recipient_id uuid;
BEGIN
  v_title := '[휴가 신청] ' || coalesce(NEW.user_name, '');
  v_message := coalesce(NEW.department, '')
    || ' · ' || coalesce(NEW.leave_type, '')
    || ' ' || coalesce(NEW.days_count::text, '') || '일'
    || ' · ' || to_char(NEW.start_date::date, 'YYYY-MM-DD');

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('부서장승인', '경유대기') THEN
    v_recipient_id := public.get_profile_id_by_name('이지형');
    IF v_recipient_id IS NOT NULL THEN
      PERFORM public.upsert_attendance_workflow_notification(
        NEW.id,
        v_recipient_id,
        '[경유 대기] ' || coalesce(NEW.user_name, ''),
        v_message
      );
    END IF;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = '최종대기' THEN
    v_recipient_id := public.get_profile_id_by_name('이용필');
    IF v_recipient_id IS NOT NULL THEN
      PERFORM public.upsert_attendance_workflow_notification(
        NEW.id,
        v_recipient_id,
        '[최종승인 대기] ' || coalesce(NEW.user_name, ''),
        v_message
      );
    END IF;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = '승인' THEN
    PERFORM public.upsert_attendance_workflow_notification(
      NEW.id,
      NEW.user_id,
      '[승인 완료] 휴가 신청',
      v_message
    );
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = '반려' THEN
    PERFORM public.upsert_attendance_workflow_notification(
      NEW.id,
      NEW.user_id,
      '[반려] 휴가 신청',
      coalesce(NEW.reject_reason, v_message)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_requests_notify_workflow_update ON public.attendance_requests;

CREATE TRIGGER attendance_requests_notify_workflow_update
AFTER UPDATE ON public.attendance_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_attendance_request_update();

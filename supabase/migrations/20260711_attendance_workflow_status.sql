-- 승인 단계를 status로 명확히 분리: 대기중 -> 경유대기 -> 최종대기 -> 승인

ALTER TABLE public.attendance_requests
  DROP CONSTRAINT IF EXISTS attendance_requests_status_check;

ALTER TABLE public.attendance_requests
  ADD CONSTRAINT attendance_requests_status_check
  CHECK (status IN ('대기중', '경유대기', '최종대기', '부서장승인', '승인', '반려'));

UPDATE public.attendance_requests
SET status = '경유대기'
WHERE status = '부서장승인'
  AND coalesce(trim(gyeongyu_by), '') = '';

UPDATE public.attendance_requests
SET status = '최종대기'
WHERE status = '부서장승인'
  AND coalesce(trim(gyeongyu_by), '') <> '';

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

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- FCM 토큰 저장
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_label text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens (user_id);

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY fcm_tokens_select_own
  ON public.fcm_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY fcm_tokens_insert_own
  ON public.fcm_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY fcm_tokens_update_own
  ON public.fcm_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY fcm_tokens_delete_own
  ON public.fcm_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Edge Function 호출 설정 (배포 후 webhook_secret을 Edge Function 시크릿에 동일하게 등록)
CREATE TABLE IF NOT EXISTS public.system_push_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.system_push_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.system_push_config FROM PUBLIC, anon, authenticated;

INSERT INTO public.system_push_config (key, value)
VALUES
  ('functions_send_fcm_url', 'https://joxfohziazjhscewifjj.supabase.co/functions/v1/send-fcm'),
  ('fcm_webhook_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dispatch_fcm_push(
  p_recipient_user_id uuid,
  p_title text,
  p_body text,
  p_url text DEFAULT '/attendance'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  IF p_recipient_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT value INTO v_url FROM public.system_push_config WHERE key = 'functions_send_fcm_url';
  SELECT value INTO v_secret FROM public.system_push_config WHERE key = 'fcm_webhook_secret';

  IF coalesce(v_url, '') = '' OR coalesce(v_secret, '') = '' THEN
    RETURN;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-fcm-webhook-secret', v_secret
      ),
      body := jsonb_build_object(
        'recipientUserId', p_recipient_user_id::text,
        'title', coalesce(p_title, '알림'),
        'body', coalesce(p_body, ''),
        'url', coalesce(p_url, '/attendance')
      )
    );
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
    WHEN OTHERS THEN
      NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_fcm_push(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_fcm_on_attendance_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.dispatch_fcm_push(
    NEW.recipient_user_id,
    NEW.title,
    NEW.message,
    '/attendance'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_request_notifications_fcm ON public.attendance_request_notifications;

CREATE TRIGGER attendance_request_notifications_fcm
AFTER INSERT ON public.attendance_request_notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_fcm_on_attendance_notification();

CREATE OR REPLACE FUNCTION public.get_profile_id_by_name(p_name text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE name = p_name
    AND coalesce(activate, true) = true
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

-- 신청 시 부서장(조재덕)에게만 알림
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

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = '부서장승인' AND NEW.gyeongyu_by IS NULL THEN
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

  IF coalesce(OLD.gyeongyu_by, '') = '' AND coalesce(NEW.gyeongyu_by, '') <> '' AND NEW.status = '부서장승인' THEN
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

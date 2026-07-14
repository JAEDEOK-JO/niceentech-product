-- FCM tokens + push config + drawing/attendance PWA dispatch + recipient settings

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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

DROP POLICY IF EXISTS fcm_tokens_select_own ON public.fcm_tokens;
CREATE POLICY fcm_tokens_select_own
  ON public.fcm_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS fcm_tokens_insert_own ON public.fcm_tokens;
CREATE POLICY fcm_tokens_insert_own
  ON public.fcm_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS fcm_tokens_update_own ON public.fcm_tokens;
CREATE POLICY fcm_tokens_update_own
  ON public.fcm_tokens FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS fcm_tokens_delete_own ON public.fcm_tokens;
CREATE POLICY fcm_tokens_delete_own
  ON public.fcm_tokens FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS fcm_tokens_select_admin ON public.fcm_tokens;
CREATE POLICY fcm_tokens_select_admin
  ON public.fcm_tokens FOR SELECT TO authenticated
  USING (public.is_push_settings_admin());

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

-- 도면 등 카테고리별 수신 여부 (row 없으면 enabled = true)
CREATE TABLE IF NOT EXISTS public.push_recipient_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  drawing_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.push_recipient_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_push_settings_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', '관리자')
  );
$$;

REVOKE ALL ON FUNCTION public.is_push_settings_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_push_settings_admin() TO authenticated;

DROP POLICY IF EXISTS push_recipient_settings_select_admin ON public.push_recipient_settings;
CREATE POLICY push_recipient_settings_select_admin
  ON public.push_recipient_settings FOR SELECT TO authenticated
  USING (public.is_push_settings_admin());

DROP POLICY IF EXISTS push_recipient_settings_insert_admin ON public.push_recipient_settings;
CREATE POLICY push_recipient_settings_insert_admin
  ON public.push_recipient_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_push_settings_admin());

DROP POLICY IF EXISTS push_recipient_settings_update_admin ON public.push_recipient_settings;
CREATE POLICY push_recipient_settings_update_admin
  ON public.push_recipient_settings FOR UPDATE TO authenticated
  USING (public.is_push_settings_admin())
  WITH CHECK (public.is_push_settings_admin());

DROP POLICY IF EXISTS push_recipient_settings_delete_admin ON public.push_recipient_settings;
CREATE POLICY push_recipient_settings_delete_admin
  ON public.push_recipient_settings FOR DELETE TO authenticated
  USING (public.is_push_settings_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_recipient_settings TO authenticated;

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

CREATE OR REPLACE FUNCTION public.list_drawing_push_recipient_ids()
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  LEFT JOIN public.push_recipient_settings s ON s.user_id = p.id
  WHERE coalesce(p.activate, true) = true
    AND coalesce(s.drawing_enabled, true) = true;
$$;

REVOKE ALL ON FUNCTION public.list_drawing_push_recipient_ids() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_drawing_fcm_notifications(
  p_title text,
  p_body text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
  v_count integer := 0;
BEGIN
  FOR v_recipient IN
    SELECT r.user_id FROM public.list_drawing_push_recipient_ids() r
  LOOP
    PERFORM public.dispatch_fcm_push(v_recipient, p_title, p_body, '/main');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_drawing_fcm_notifications(text, text) FROM PUBLIC, anon, authenticated;

-- 도면 배포: 텔레그램 대신 PWA(FCM)
CREATE OR REPLACE FUNCTION public.process_drawing_telegram_notification(p_notification_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_row public.drawing_telegram_notifications%ROWTYPE;
  v_sent integer := 0;
BEGIN
  SELECT *
    INTO target_row
  FROM public.drawing_telegram_notifications
  WHERE id = p_notification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF target_row.delivery_status = 'sent' THEN
    RETURN;
  END IF;

  v_sent := public.dispatch_drawing_fcm_notifications(
    CASE
      WHEN target_row.event_type = 'cancelled' THEN '도면배포 취소'
      ELSE '도면배포'
    END,
    coalesce(nullif(btrim(target_row.message), ''), '도면배포')
  );

  UPDATE public.drawing_telegram_notifications
  SET delivery_status = 'sent',
      skip_reason = 'fcm_pwa',
      last_error = null,
      response_status_code = null,
      response_body = format('fcm_recipients=%s', v_sent),
      sent_at = now(),
      attempt_count = attempt_count + 1,
      updated_at = now()
  WHERE id = p_notification_id;
END;
$$;

-- 근태 알림: upsert 시마다 FCM (UPDATE 포함)
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

  PERFORM public.dispatch_fcm_push(
    p_recipient_user_id,
    p_title,
    p_message,
    '/attendance'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_attendance_workflow_notification(bigint, uuid, text, text)
  FROM PUBLIC, anon, authenticated;

-- INSERT 트리거와 upsert 이중 발송 방지
DROP TRIGGER IF EXISTS attendance_request_notifications_fcm ON public.attendance_request_notifications;

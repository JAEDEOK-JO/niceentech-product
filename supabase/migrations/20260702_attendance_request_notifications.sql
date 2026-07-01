CREATE TABLE IF NOT EXISTS public.attendance_request_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  attendance_request_id bigint NOT NULL REFERENCES public.attendance_requests(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  UNIQUE (attendance_request_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_request_notifications_recipient
  ON public.attendance_request_notifications (recipient_user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_request_notifications_request
  ON public.attendance_request_notifications (attendance_request_id);

ALTER TABLE public.attendance_request_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_request_notifications_select_own
  ON public.attendance_request_notifications
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

CREATE POLICY attendance_request_notifications_update_own
  ON public.attendance_request_notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_admins_on_attendance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_rec record;
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

  FOR admin_rec IN
    SELECT id
    FROM public.profiles
    WHERE coalesce(activate, true) = true
      AND role::text IN ('admin', '관리자')
  LOOP
    INSERT INTO public.attendance_request_notifications (
      attendance_request_id,
      recipient_user_id,
      title,
      message
    ) VALUES (
      NEW.id,
      admin_rec.id,
      v_title,
      v_message
    )
    ON CONFLICT (attendance_request_id, recipient_user_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_requests_notify_admins ON public.attendance_requests;

CREATE TRIGGER attendance_requests_notify_admins
AFTER INSERT ON public.attendance_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_attendance_request();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'attendance_request_notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_request_notifications';
  END IF;
END
$$;

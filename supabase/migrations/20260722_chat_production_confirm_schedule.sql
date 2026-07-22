-- 작업확인 스케줄(재확인 요청) + 확인 RPC
CREATE TABLE IF NOT EXISTS public.chat_scheduled_messages (
  id bigserial PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  source_message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  file_type text NOT NULL DEFAULT 'production_recheck',
  run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  processed_at timestamptz NULL,
  last_error text NULL
);

CREATE INDEX IF NOT EXISTS chat_scheduled_messages_due_idx
  ON public.chat_scheduled_messages (status, run_at);

ALTER TABLE public.chat_scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_scheduled_messages_select_auth ON public.chat_scheduled_messages;
CREATE POLICY chat_scheduled_messages_select_auth
  ON public.chat_scheduled_messages FOR SELECT TO authenticated
  USING (true);

-- 방 멤버가 요청 메시지 작업확인 처리
CREATE OR REPLACE FUNCTION public.confirm_chat_production_request(
  p_message_id uuid,
  p_option_id text,
  p_option_label text,
  p_status text,
  p_recheck_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_name text;
  v_msg public.chat_messages%ROWTYPE;
  v_content jsonb;
  v_confirmation jsonb;
  v_confirm_payload jsonb;
  v_recheck_payload jsonb;
  v_now timestamptz := timezone('utc', now());
  v_confirm_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF coalesce(btrim(p_option_id), '') = '' OR coalesce(btrim(p_option_label), '') = '' THEN
    RAISE EXCEPTION 'invalid_option';
  END IF;

  SELECT * INTO v_msg
  FROM public.chat_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'message_not_found';
  END IF;

  IF v_msg.file_type IS DISTINCT FROM 'production_request' THEN
    RAISE EXCEPTION 'not_production_request';
  END IF;

  BEGIN
    v_content := v_msg.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'invalid_content';
  END;

  IF v_content ? 'confirmation' AND v_content->'confirmation' IS NOT NULL AND v_content->>'confirmation' <> 'null' THEN
    IF coalesce(btrim(v_content->'confirmation'->>'confirmedAt'), '') <> '' THEN
      RAISE EXCEPTION 'already_confirmed';
    END IF;
  END IF;

  SELECT coalesce(nullif(btrim(name), ''), '알 수 없음')
    INTO v_user_name
  FROM public.profiles
  WHERE id = v_user_id;

  v_confirmation := jsonb_build_object(
    'confirmedAt', v_now,
    'confirmedById', v_user_id,
    'confirmedByName', v_user_name,
    'optionId', p_option_id,
    'optionLabel', p_option_label,
    'status', p_status,
    'recheckAt', CASE WHEN p_recheck_at IS NULL THEN NULL ELSE to_jsonb(p_recheck_at) END
  );

  v_content := v_content || jsonb_build_object('confirmation', v_confirmation);

  UPDATE public.chat_messages
  SET content = v_content::text
  WHERE id = p_message_id;

  v_confirm_payload := jsonb_build_object(
    'v', 1,
    'kind', 'confirm',
    'sourceMessageId', p_message_id,
    'productId', coalesce((v_content->>'productId')::bigint, 0),
    'initial', coalesce(v_content->>'initial', ''),
    'testDate', coalesce(v_content->>'testDate', ''),
    'company', coalesce(v_content->>'company', ''),
    'place', coalesce(v_content->>'place', ''),
    'area', coalesce(v_content->>'area', ''),
    'hasDrawing', coalesce((v_content->>'hasDrawing')::boolean, false),
    'drawingUrl', coalesce(v_content->>'drawingUrl', ''),
    'drawings', coalesce(v_content->'drawings', '[]'::jsonb),
    'requestTypeLabel', coalesce(v_content->>'requestTypeLabel', '요청'),
    'confirmedAt', v_now,
    'confirmedByName', v_user_name,
    'optionId', p_option_id,
    'optionLabel', p_option_label,
    'status', p_status,
    'recheckAt', CASE WHEN p_recheck_at IS NULL THEN NULL ELSE to_jsonb(p_recheck_at) END
  );

  INSERT INTO public.chat_messages (
    room_id, sender_id, sender_name, content, file_url, file_type, mentioned_user_ids, skip_push
  ) VALUES (
    v_msg.room_id,
    v_user_id,
    v_user_name,
    v_confirm_payload::text,
    coalesce(v_content->>'drawingUrl', ''),
    'production_confirm',
    '{}'::uuid[],
    false
  )
  RETURNING id INTO v_confirm_id;

  IF p_status = 'in_progress' AND p_recheck_at IS NOT NULL THEN
    v_recheck_payload := jsonb_build_object(
      'v', 1,
      'kind', 'recheck',
      'sourceMessageId', p_message_id,
      'productId', coalesce((v_content->>'productId')::bigint, 0),
      'initial', coalesce(v_content->>'initial', ''),
      'testDate', coalesce(v_content->>'testDate', ''),
      'company', coalesce(v_content->>'company', ''),
      'place', coalesce(v_content->>'place', ''),
      'area', coalesce(v_content->>'area', ''),
      'hasDrawing', coalesce((v_content->>'hasDrawing')::boolean, false),
      'drawingUrl', coalesce(v_content->>'drawingUrl', ''),
      'drawings', coalesce(v_content->'drawings', '[]'::jsonb),
      'requestTypeLabel', '재확인 요청',
      'requestText', concat(coalesce(v_content->>'requestTypeLabel', '요청'), ' 재확인'),
      'recipients', coalesce(v_content->'recipients', '[]'::jsonb)
    );

    INSERT INTO public.chat_scheduled_messages (
      room_id, source_message_id, payload, file_type, run_at, status, created_by
    ) VALUES (
      v_msg.room_id,
      p_message_id,
      v_recheck_payload,
      'production_recheck',
      p_recheck_at,
      'pending',
      v_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'confirmMessageId', v_confirm_id,
    'confirmedAt', v_now,
    'confirmedByName', v_user_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_chat_production_request(uuid, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_chat_production_request(uuid, text, text, text, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_chat_scheduled_messages(p_limit integer DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.chat_scheduled_messages%ROWTYPE;
  v_count integer := 0;
BEGIN
  FOR v_row IN
    SELECT *
    FROM public.chat_scheduled_messages
    WHERE status = 'pending'
      AND run_at <= timezone('utc', now())
    ORDER BY run_at ASC
    LIMIT greatest(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      INSERT INTO public.chat_messages (
        room_id, sender_id, sender_name, content, file_url, file_type, mentioned_user_ids, skip_push
      ) VALUES (
        v_row.room_id,
        v_row.created_by,
        '시스템',
        v_row.payload::text,
        coalesce(v_row.payload->>'drawingUrl', ''),
        coalesce(nullif(v_row.file_type, ''), 'production_recheck'),
        '{}'::uuid[],
        false
      );

      UPDATE public.chat_scheduled_messages
      SET status = 'done',
          processed_at = timezone('utc', now()),
          last_error = NULL
      WHERE id = v_row.id;

      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.chat_scheduled_messages
      SET last_error = left(SQLERRM, 300)
      WHERE id = v_row.id;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_chat_scheduled_messages(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_chat_scheduled_messages(integer) TO authenticated, service_role;

-- 1분마다 예정 메시지 처리
DO $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'process_chat_scheduled_messages' LIMIT 1;
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'process_chat_scheduled_messages',
  '* * * * *',
  $$SELECT public.process_chat_scheduled_messages(50);$$
);

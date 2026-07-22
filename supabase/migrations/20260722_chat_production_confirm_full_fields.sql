-- confirm payload 에 requestText/recipients 포함
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
  v_trigger public.chat_messages%ROWTYPE;
  v_msg public.chat_messages%ROWTYPE;
  v_trigger_content jsonb;
  v_content jsonb;
  v_confirmation jsonb;
  v_confirm_payload jsonb;
  v_recheck_payload jsonb;
  v_now timestamptz := timezone('utc', now());
  v_confirm_id uuid;
  v_source_id uuid;
  v_existing_status text;
  v_product_id bigint;
  v_test_date text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF coalesce(btrim(p_option_id), '') = '' OR coalesce(btrim(p_option_label), '') = '' THEN
    RAISE EXCEPTION 'invalid_option';
  END IF;

  SELECT * INTO v_trigger
  FROM public.chat_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'message_not_found';
  END IF;

  BEGIN
    v_trigger_content := v_trigger.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'invalid_content';
  END;

  IF v_trigger.file_type IN ('production_confirm', 'production_recheck') THEN
    IF v_trigger.file_type = 'production_confirm'
       AND coalesce(v_trigger_content->>'status', '') <> 'in_progress' THEN
      RAISE EXCEPTION 'not_reconfirmable';
    END IF;
    IF coalesce((v_trigger_content->>'closed')::boolean, false) THEN
      RAISE EXCEPTION 'already_closed';
    END IF;

    v_source_id := nullif(btrim(coalesce(v_trigger_content->>'sourceMessageId', '')), '')::uuid;
    IF v_source_id IS NULL THEN
      RAISE EXCEPTION 'missing_source_message';
    END IF;

    SELECT * INTO v_msg
    FROM public.chat_messages
    WHERE id = v_source_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'source_message_not_found';
    END IF;
  ELSIF v_trigger.file_type = 'production_request' THEN
    v_msg := v_trigger;
    v_source_id := v_msg.id;
  ELSE
    RAISE EXCEPTION 'not_production_request';
  END IF;

  IF v_msg.file_type IS DISTINCT FROM 'production_request' THEN
    RAISE EXCEPTION 'not_production_request';
  END IF;

  BEGIN
    v_content := v_msg.content::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'invalid_content';
  END;

  IF v_content ? 'confirmation'
     AND v_content->'confirmation' IS NOT NULL
     AND v_content->>'confirmation' <> 'null'
     AND coalesce(btrim(v_content->'confirmation'->>'confirmedAt'), '') <> '' THEN
    v_existing_status := coalesce(btrim(v_content->'confirmation'->>'status'), '');
    IF v_trigger.file_type = 'production_request' THEN
      RAISE EXCEPTION 'already_confirmed';
    END IF;
    IF v_existing_status IS DISTINCT FROM 'in_progress' THEN
      RAISE EXCEPTION 'already_confirmed';
    END IF;
  END IF;

  v_product_id := coalesce((v_content->>'productId')::bigint, 0);
  v_test_date := coalesce(nullif(btrim(v_content->>'testDate'), ''), '');
  IF v_test_date = '' AND v_product_id > 0 THEN
    SELECT coalesce(nullif(btrim(test_date::text), ''), '')
      INTO v_test_date
    FROM public.product_list
    WHERE id = v_product_id;
    v_test_date := coalesce(v_test_date, '');
    IF v_test_date <> '' THEN
      v_content := v_content || jsonb_build_object('testDate', v_test_date);
    END IF;
  END IF;

  UPDATE public.chat_scheduled_messages
  SET status = 'cancelled',
      processed_at = v_now,
      last_error = NULL
  WHERE source_message_id = v_source_id
    AND status = 'pending';

  DELETE FROM public.chat_messages
  WHERE room_id = v_msg.room_id
    AND file_type IN ('production_confirm', 'production_recheck')
    AND (
      id = p_message_id
      OR content::jsonb->>'sourceMessageId' = v_source_id::text
    );

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
  WHERE id = v_source_id;

  v_confirm_payload := jsonb_build_object(
    'v', 1,
    'kind', 'confirm',
    'sourceMessageId', v_source_id,
    'productId', v_product_id,
    'initial', coalesce(v_content->>'initial', ''),
    'testDate', v_test_date,
    'company', coalesce(v_content->>'company', ''),
    'place', coalesce(v_content->>'place', ''),
    'area', coalesce(v_content->>'area', ''),
    'hasDrawing', coalesce((v_content->>'hasDrawing')::boolean, false),
    'drawingUrl', coalesce(v_content->>'drawingUrl', ''),
    'drawings', coalesce(v_content->'drawings', '[]'::jsonb),
    'requestTypeLabel', coalesce(v_content->>'requestTypeLabel', '요청'),
    'requestText', coalesce(v_content->>'requestText', ''),
    'recipients', coalesce(v_content->'recipients', '[]'::jsonb),
    'confirmedAt', v_now,
    'confirmedByName', v_user_name,
    'optionId', p_option_id,
    'optionLabel', p_option_label,
    'status', p_status,
    'recheckAt', CASE WHEN p_recheck_at IS NULL THEN NULL ELSE to_jsonb(p_recheck_at) END,
    'closed', false
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
      'sourceMessageId', v_source_id,
      'productId', v_product_id,
      'initial', coalesce(v_content->>'initial', ''),
      'testDate', v_test_date,
      'company', coalesce(v_content->>'company', ''),
      'place', coalesce(v_content->>'place', ''),
      'area', coalesce(v_content->>'area', ''),
      'hasDrawing', coalesce((v_content->>'hasDrawing')::boolean, false),
      'drawingUrl', coalesce(v_content->>'drawingUrl', ''),
      'drawings', coalesce(v_content->'drawings', '[]'::jsonb),
      'requestTypeLabel', coalesce(v_content->>'requestTypeLabel', '요청'),
      'requestText', coalesce(v_content->>'requestText', ''),
      'recipients', coalesce(v_content->'recipients', '[]'::jsonb),
      'closed', false
    );

    INSERT INTO public.chat_scheduled_messages (
      room_id, source_message_id, payload, file_type, run_at, status, created_by
    ) VALUES (
      v_msg.room_id,
      v_source_id,
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
    'confirmedByName', v_user_name,
    'sourceMessageId', v_source_id
  );
END;
$$;

set local lock_timeout = '5s';

create policy active_member_only on public.spmt_item
  as restrictive for all to authenticated
  using ((select public.is_active_member()))
  with check ((select public.is_active_member()));

create policy active_member_only on public.spmt_stock_move
  as restrictive for all to authenticated
  using ((select public.is_active_member()))
  with check ((select public.is_active_member()));

create policy active_member_only on storage.objects
  as restrictive for all to authenticated
  using ((select public.is_active_member()))
  with check ((select public.is_active_member()));

CREATE OR REPLACE FUNCTION public.confirm_chat_production_request(p_message_id uuid, p_option_id text, p_option_label text, p_status text, p_recheck_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if auth.role() = 'authenticated' and not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
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
$function$;

CREATE OR REPLACE FUNCTION public.list_chat_production_work_board(p_room_id uuid, p_tab text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer := greatest(coalesce(p_limit, 10), 1);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_items jsonb := '[]'::jsonb;
BEGIN
  if auth.role() = 'authenticated' and not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  IF p_room_id IS NULL THEN
    RAISE EXCEPTION 'room_required';
  END IF;

  IF p_tab = 'done' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
      INTO v_items
    FROM (
      SELECT
        m.id,
        m.room_id,
        m.sender_id,
        m.sender_name,
        m.content,
        m.file_type,
        m.file_url,
        m.created_at,
        coalesce(
          nullif(btrim(m.content::jsonb->>'sourceMessageId'), '')::uuid,
          m.id
        ) AS source_message_id,
        'confirm'::text AS display_kind
      FROM public.chat_messages m
      WHERE m.room_id = p_room_id
        AND m.file_type = 'production_confirm'
        AND coalesce(m.content::jsonb->>'status', '') IN ('work_done', 'welding_done')
      ORDER BY m.created_at DESC
      OFFSET v_offset
      LIMIT v_limit
    ) t;

    RETURN jsonb_build_object('ok', true, 'items', v_items);
  END IF;

  IF p_tab IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'invalid_tab';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.sort_at DESC), '[]'::jsonb)
    INTO v_items
  FROM (
    SELECT
      coalesce(d.id, r.id) AS id,
      coalesce(d.room_id, r.room_id) AS room_id,
      coalesce(d.sender_id, r.sender_id) AS sender_id,
      coalesce(d.sender_name, r.sender_name) AS sender_name,
      coalesce(d.content, r.content) AS content,
      coalesce(d.file_type, r.file_type) AS file_type,
      coalesce(d.file_url, r.file_url) AS file_url,
      coalesce(d.created_at, r.created_at) AS created_at,
      r.id AS source_message_id,
      CASE
        WHEN d.file_type = 'production_recheck' THEN 'recheck'
        WHEN d.file_type = 'production_confirm' THEN 'confirm'
        ELSE 'request'
      END AS display_kind,
      coalesce(d.created_at, r.created_at) AS sort_at
    FROM (
      SELECT m.*
      FROM public.chat_messages m
      WHERE m.room_id = p_room_id
        AND m.file_type = 'production_request'
        AND (
          m.content::jsonb->'confirmation' IS NULL
          OR m.content::jsonb->>'confirmation' = 'null'
          OR coalesce(btrim(m.content::jsonb->'confirmation'->>'confirmedAt'), '') = ''
          OR coalesce(m.content::jsonb->'confirmation'->>'status', '') = 'in_progress'
        )
      ORDER BY m.created_at DESC
      OFFSET v_offset
      LIMIT v_limit
    ) r
    LEFT JOIN LATERAL (
      SELECT c.*
      FROM public.chat_messages c
      WHERE c.room_id = p_room_id
        AND c.file_type IN ('production_confirm', 'production_recheck')
        AND c.content::jsonb->>'sourceMessageId' = r.id::text
        AND (
          c.file_type = 'production_recheck'
          OR (
            c.file_type = 'production_confirm'
            AND coalesce(c.content::jsonb->>'status', '') = 'in_progress'
            AND coalesce((c.content::jsonb->>'closed')::boolean, false) = false
          )
        )
      ORDER BY c.created_at DESC
      LIMIT 1
    ) d ON true
  ) t;

  RETURN jsonb_build_object('ok', true, 'items', v_items);
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_chat_scheduled_messages(p_limit integer DEFAULT 50)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.chat_scheduled_messages%ROWTYPE;
  v_count integer := 0;
  v_source_id uuid;
  v_payload jsonb;
BEGIN
  if auth.role() = 'authenticated' and not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
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
      v_payload := v_row.payload;
      v_source_id := v_row.source_message_id;

      IF coalesce(nullif(v_row.file_type, ''), 'production_recheck') = 'production_recheck' THEN
        DELETE FROM public.chat_messages
        WHERE room_id = v_row.room_id
          AND file_type IN ('production_confirm', 'production_recheck')
          AND content::jsonb->>'sourceMessageId' = v_source_id::text;
      END IF;

      INSERT INTO public.chat_messages (
        room_id, sender_id, sender_name, content, file_url, file_type, mentioned_user_ids, skip_push
      ) VALUES (
        v_row.room_id,
        v_row.created_by,
        '시스템',
        (coalesce(v_payload, '{}'::jsonb) || jsonb_build_object('closed', false))::text,
        coalesce(v_payload->>'drawingUrl', ''),
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
$function$;

CREATE OR REPLACE FUNCTION public.upsert_device_token(token text, platform text)
 RETURNS device_tokens
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    current_user_id uuid := auth.uid();
    result_row public.device_tokens;
begin
  if auth.role() = 'authenticated' and not public.is_active_member() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
    if current_user_id is null then
        raise exception 'auth.uid() is null. device token can only be stored by an authenticated user';
    end if;

    if platform not in ('ios', 'android', 'web') then
        raise exception 'invalid platform: %', platform using errcode = '22023';
    end if;

    insert into public.device_tokens (user_id, device_token, platform, updated_at)
    values (current_user_id, token, platform, now())
    on conflict (device_token)
    do update set
        user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now()
    returning * into result_row;

    return result_row;
end;
$function$;

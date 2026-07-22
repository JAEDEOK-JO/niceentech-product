-- 작업요청/작업완료 보드 목록 (10개 페이지)
CREATE OR REPLACE FUNCTION public.list_chat_production_work_board(
  p_room_id uuid,
  p_tab text,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := greatest(coalesce(p_limit, 10), 1);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_items jsonb := '[]'::jsonb;
BEGIN
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
$$;

REVOKE ALL ON FUNCTION public.list_chat_production_work_board(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_chat_production_work_board(uuid, text, integer, integer) TO authenticated;

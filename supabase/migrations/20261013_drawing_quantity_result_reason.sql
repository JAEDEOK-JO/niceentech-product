CREATE OR REPLACE FUNCTION public.drawing_quantity_result_message(
  run_state text,
  run_error text,
  pages jsonb,
  records jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  lines text[] := ARRAY[]::text[];
  page jsonb;
  rec jsonb;
  line text;
  where_text text;
  why_text text;
  diameter text;
BEGIN
  IF run_state = 'failed' THEN
    RETURN CASE run_error
      WHEN 'company_missing' THEN '회사 연결 실패'
      WHEN 'test_date_missing' THEN '검수일이 없습니다'
      WHEN 'plan_missing' THEN '생산계획을 찾지 못했습니다'
      WHEN 'openai_key_missing' THEN 'API 키 없음'
      WHEN 'drawing_missing' THEN '도면 파일을 찾지 못했습니다'
      WHEN 'pdf_empty' THEN '도면 페이지가 없습니다'
      WHEN 'insert_failed' THEN '검수리스트 등록 실패'
      ELSE CASE
        WHEN coalesce(run_error, '') LIKE 'openai_%' THEN '도면 수량 읽기 실패'
        WHEN coalesce(run_error, '') = '' THEN '검수리스트 등록 실패'
        ELSE left(run_error, 80)
      END
    END;
  END IF;

  FOR page IN SELECT value FROM jsonb_array_elements(coalesce(pages, '[]'::jsonb))
  LOOP
    IF page->>'state' IN ('failed', 'pending') THEN
      line := (page->>'pdf_page') || '장 읽기 실패';
      IF coalesce(page->>'unread_reason', '') <> '' THEN
        line := line || ', ' || (page->>'unread_reason');
      END IF;
    ELSIF page->>'state' = 'read' AND page->>'fully_read' = 'false' AND coalesce(page->>'unread_reason', '') <> '' THEN
      line := (page->>'pdf_page') || '장, ' || (page->>'unread_reason');
    ELSE
      line := '';
    END IF;
    IF line <> '' AND NOT (line = ANY(lines)) THEN
      lines := lines || line;
    END IF;
  END LOOP;

  FOR rec IN SELECT value FROM jsonb_array_elements(coalesce(records, '[]'::jsonb))
  LOOP
    IF rec->>'status' <> 'uncertain' THEN
      CONTINUE;
    END IF;
    diameter := coalesce(rec->>'body_diameter', '');
    where_text := concat_ws(
      ' ',
      (rec->>'pdf_page') || '장',
      CASE WHEN coalesce(rec->>'pipe_no', '') <> '' THEN (rec->>'pipe_no') || '번' END,
      CASE WHEN diameter ~ '^[0-9]+$' THEN diameter || 'A' END,
      CASE
        WHEN coalesce(rec->>'pipe_part', '') <> '' AND rec->>'pipe_part' <> '단일' THEN rec->>'pipe_part'
      END,
      CASE
        WHEN coalesce(rec->>'pipe_part', '') IN ('', '단일') AND coalesce(rec->>'location', '') <> '' THEN rec->>'location'
      END
    );
    why_text := coalesce(nullif(rec->>'reason', ''), nullif(rec->>'check_note', ''), '');
    line := CASE WHEN why_text <> '' THEN where_text || ', ' || why_text ELSE where_text END;
    IF line <> '' AND NOT (line = ANY(lines)) THEN
      lines := lines || line;
    END IF;
  END LOOP;

  RETURN array_to_string(lines, E'\n');
END;
$$;

UPDATE public.drawing_quantity_runs
SET result_message = public.drawing_quantity_result_message(state, error, pages, records)
WHERE state IN ('done', 'review', 'failed');

DROP FUNCTION public.drawing_quantity_result_message(text, text, jsonb, jsonb);

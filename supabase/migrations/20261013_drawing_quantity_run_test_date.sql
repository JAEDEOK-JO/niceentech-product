ALTER TABLE public.drawing_quantity_runs
  ADD COLUMN IF NOT EXISTS test_date text,
  ADD COLUMN IF NOT EXISTS drawing_no text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS place text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS result_message text;

CREATE INDEX IF NOT EXISTS drawing_quantity_runs_test_date_idx
  ON public.drawing_quantity_runs (test_date, finished_at DESC);

UPDATE public.drawing_quantity_runs AS run
SET
  test_date = plan.test_date,
  drawing_no = plan.initial,
  company = plan.company,
  place = plan.place,
  area = plan.area
FROM public.product_list AS plan
WHERE run.product_list_id = plan.id
  AND run.test_date IS NULL;

UPDATE public.drawing_quantity_runs
SET result_message = CASE
  WHEN state = 'failed' THEN CASE error
    WHEN 'company_missing' THEN '회사 연결 실패'
    WHEN 'test_date_missing' THEN '검수일이 없습니다'
    WHEN 'plan_missing' THEN '생산계획을 찾지 못했습니다'
    WHEN 'openai_key_missing' THEN 'API 키 없음'
    WHEN 'drawing_missing' THEN '도면 파일을 찾지 못했습니다'
    WHEN 'pdf_empty' THEN '도면 페이지가 없습니다'
    WHEN 'insert_failed' THEN '검수리스트 등록 실패'
    ELSE CASE
      WHEN coalesce(error, '') LIKE 'openai_%' THEN '도면 수량 읽기 실패'
      WHEN coalesce(error, '') = '' THEN '검수리스트 등록 실패'
      ELSE left(error, 80)
    END
  END
  ELSE concat_ws(
    ' · ',
    CASE
      WHEN concat_ws(
        ', ',
        CASE WHEN coalesce((counts->>'32')::numeric, 0) > 0 THEN '32A ' || (counts->>'32') END,
        CASE WHEN coalesce((counts->>'40')::numeric, 0) > 0 THEN '40A ' || (counts->>'40') END,
        CASE WHEN coalesce((counts->>'50')::numeric, 0) > 0 THEN '50A ' || (counts->>'50') END,
        CASE WHEN coalesce((counts->>'65')::numeric, 0) > 0 THEN '65A ' || (counts->>'65') END,
        CASE WHEN coalesce((counts->>'80')::numeric, 0) > 0 THEN '80A ' || (counts->>'80') END,
        CASE WHEN coalesce((counts->>'100')::numeric, 0) > 0 THEN '100A ' || (counts->>'100') END,
        CASE WHEN coalesce((counts->>'125')::numeric, 0) > 0 THEN '125A ' || (counts->>'125') END,
        CASE WHEN coalesce((counts->>'150')::numeric, 0) > 0 THEN '150A ' || (counts->>'150') END,
        CASE WHEN coalesce((counts->>'200')::numeric, 0) > 0 THEN '200A ' || (counts->>'200') END
      ) = '' THEN '수량 없음'
      ELSE concat_ws(
        ', ',
        CASE WHEN coalesce((counts->>'32')::numeric, 0) > 0 THEN '32A ' || (counts->>'32') END,
        CASE WHEN coalesce((counts->>'40')::numeric, 0) > 0 THEN '40A ' || (counts->>'40') END,
        CASE WHEN coalesce((counts->>'50')::numeric, 0) > 0 THEN '50A ' || (counts->>'50') END,
        CASE WHEN coalesce((counts->>'65')::numeric, 0) > 0 THEN '65A ' || (counts->>'65') END,
        CASE WHEN coalesce((counts->>'80')::numeric, 0) > 0 THEN '80A ' || (counts->>'80') END,
        CASE WHEN coalesce((counts->>'100')::numeric, 0) > 0 THEN '100A ' || (counts->>'100') END,
        CASE WHEN coalesce((counts->>'125')::numeric, 0) > 0 THEN '125A ' || (counts->>'125') END,
        CASE WHEN coalesce((counts->>'150')::numeric, 0) > 0 THEN '150A ' || (counts->>'150') END,
        CASE WHEN coalesce((counts->>'200')::numeric, 0) > 0 THEN '200A ' || (counts->>'200') END
      )
    END,
    (
      SELECT nullif(string_agg((page->>'pdf_page') || '페이지 읽기 실패', ', '), '')
      FROM jsonb_array_elements(coalesce(pages, '[]'::jsonb)) AS page
      WHERE page->>'state' IN ('failed', 'pending')
    ),
    (
      SELECT nullif(string_agg((page->>'pdf_page') || '페이지 일부만 읽음', ', '), '')
      FROM jsonb_array_elements(coalesce(pages, '[]'::jsonb)) AS page
      WHERE page->>'state' = 'read' AND page->>'fully_read' = 'false'
    ),
    CASE
      WHEN coalesce(uncertain_count, 0) > 0 THEN '미확정 ' || uncertain_count || '건'
    END
  )
END
WHERE result_message IS NULL
  AND state IN ('done', 'review', 'failed');

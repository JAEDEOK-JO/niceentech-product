-- product_list.company_info 미연결 보정 + 진행된 헤드수량 재집계
-- 1) 회사명+현장명 공백 무시 매칭
UPDATE public.product_list p
SET company_info = c.id
FROM public.company_list c
WHERE p.company_info IS NULL
  AND nullif(trim(p.company), '') IS NOT NULL
  AND nullif(trim(p.place), '') IS NOT NULL
  AND replace(coalesce(p.company, ''), ' ', '') = replace(coalesce(c.company, ''), ' ', '')
  AND replace(coalesce(p.place, ''), ' ', '') = replace(coalesce(c.place, ''), ' ', '');

-- 2) 현장명(공백 무시)이 company_list에서 유일한 경우
WITH unique_places AS (
  SELECT replace(coalesce(place, ''), ' ', '') AS pnorm, (array_agg(id))[1] AS company_id
  FROM public.company_list
  WHERE nullif(trim(place), '') IS NOT NULL
  GROUP BY 1
  HAVING count(*) = 1
)
UPDATE public.product_list p
SET company_info = u.company_id
FROM unique_places u
WHERE p.company_info IS NULL
  AND nullif(trim(p.place), '') IS NOT NULL
  AND replace(coalesce(p.place, ''), ' ', '') = u.pnorm;

-- 3) 진행된 헤드수량 전체 재집계
UPDATE public.company_list
SET progressed_head_count = 0;

UPDATE public.company_list c
SET progressed_head_count = COALESCE(s.total_head, 0)
FROM (
  SELECT company_info AS id, SUM(COALESCE(head, 0))::bigint AS total_head
  FROM public.product_list
  WHERE shipment IS TRUE
    AND company_info IS NOT NULL
  GROUP BY company_info
) s
WHERE c.id = s.id;

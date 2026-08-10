-- 출하완료 + 회사리스트와 매칭되는 건만 company_info 채움 (신규 회사 생성 없음)

WITH shipped AS (
  SELECT
    id,
    company,
    place,
    replace(coalesce(company, ''), ' ', '') AS cnorm,
    replace(
      replace(
        replace(coalesce(place, ''), ' ', ''),
        '힐스테이드',
        '힐스테이트'
      ),
      '등촌역',
      '등촌동'
    ) AS pnorm,
    regexp_replace(coalesce(place, ''), '[^가-힣A-Za-z0-9]', '', 'g') AS pclean
  FROM public.product_list
  WHERE company_info IS NULL
    AND shipment IS TRUE
    AND nullif(trim(company), '') IS NOT NULL
    AND nullif(trim(place), '') IS NOT NULL
),
exact_cands AS (
  SELECT s.id AS pid, c.id AS cid
  FROM shipped s
  JOIN public.company_list c
    ON replace(coalesce(c.company, ''), ' ', '') = s.cnorm
   AND replace(
         replace(
           replace(coalesce(c.place, ''), ' ', ''),
           '힐스테이드',
           '힐스테이트'
         ),
         '등촌역',
         '등촌동'
       ) = s.pnorm
),
prefix_cands AS (
  SELECT s.id AS pid, c.id AS cid
  FROM shipped s
  JOIN public.company_list c
    ON replace(coalesce(c.company, ''), ' ', '') = s.cnorm
   AND length(s.pclean) >= 4
   AND regexp_replace(coalesce(c.place, ''), '[^가-힣A-Za-z0-9]', '', 'g') LIKE s.pclean || '%'
  WHERE NOT EXISTS (SELECT 1 FROM exact_cands e WHERE e.pid = s.id)
),
uniq AS (
  SELECT pid, (array_agg(cid))[1] AS cid
  FROM (
    SELECT * FROM exact_cands
    UNION ALL
    SELECT * FROM prefix_cands
  ) x
  GROUP BY pid
  HAVING count(DISTINCT cid) = 1
)
UPDATE public.product_list p
SET company_info = u.cid
FROM uniq u
WHERE p.id = u.pid
  AND p.company_info IS NULL
  AND p.shipment IS TRUE;

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

WITH new_subsidiary_items(material_group, spec, sort_order) AS (
  VALUES
    ('FL', '용접식', 1000),
    ('FL', '나사식', 1010),
    ('45도 엘보(w)', '25A', 1100),
    ('45도 엘보(w)', '32A', 1110),
    ('45도 엘보(w)', '40A', 1120),
    ('45도 엘보(w)', '50A', 1130),
    ('45도 엘보(w)', '65A', 1140),
    ('45도 엘보(w)', '80A', 1150),
    ('45도 엘보(w)', '100A', 1160),
    ('45도 엘보(w)', '125A', 1170),
    ('45도 엘보(w)', '150A', 1180),
    ('엘보(w)', '25A', 1200),
    ('엘보(w)', '32A', 1210),
    ('엘보(w)', '40A', 1220),
    ('엘보(w)', '50A', 1230),
    ('엘보(w)', '65A', 1240),
    ('엘보(w)', '80A', 1250),
    ('엘보(w)', '100A', 1260),
    ('엘보(w)', '125A', 1270),
    ('엘보(w)', '150A', 1280),
    ('티(w)', '25A', 1300),
    ('티(w)', '32A', 1310),
    ('티(w)', '40A', 1320),
    ('티(w)', '50A', 1330),
    ('티(w)', '65A', 1340),
    ('티(w)', '80A', 1350),
    ('티(w)', '100A', 1360),
    ('티(w)', '125A', 1370),
    ('티(w)', '150A', 1380),
    ('정심 레듀사(W)', '50A*25A', 1400),
    ('정심 레듀사(W)', '65A*25A', 1410),
    ('정심 레듀사(W)', '65A*32A', 1420),
    ('정심 레듀사(W)', '80A*65A', 1430),
    ('정심 레듀사(W)', '100A*65A', 1440),
    ('정심 레듀사(W)', '125A*65A', 1450),
    ('정심 레듀사(W)', '125A*80A', 1460),
    ('정심 레듀사(W)', '150A*65A', 1470),
    ('정심 레듀사(W)', '150A*80A', 1480),
    ('정심 레듀사(W)', '150A*100A', 1490),
    ('편심 레듀사(W)', '50A*25A', 1500),
    ('편심 레듀사(W)', '65A*25A', 1510),
    ('편심 레듀사(W)', '65A*32A', 1520),
    ('편심 레듀사(W)', '80A*65A', 1530),
    ('편심 레듀사(W)', '100A*65A', 1540),
    ('편심 레듀사(W)', '125A*65A', 1550),
    ('편심 레듀사(W)', '125A*80A', 1560),
    ('편심 레듀사(W)', '150A*65A', 1570),
    ('편심 레듀사(W)', '150A*80A', 1580),
    ('편심 레듀사(W)', '150A*100A', 1590),
    ('플렌지', '32A', 1600),
    ('플렌지', '40A', 1610),
    ('플렌지', '50A', 1620),
    ('플렌지', '65A', 1630),
    ('플렌지', '80A', 1640),
    ('플렌지', '100A', 1650),
    ('플렌지', '125A', 1660),
    ('플렌지', '150A', 1670),
    ('엘보(S)', '25A', 1700),
    ('엘보(S)', '32A', 1710),
    ('엘보(S)', '40A', 1720),
    ('엘보(S)', '50A', 1730),
    ('45도 엘보(S)', '25A', 1800),
    ('45도 엘보(S)', '32A', 1810),
    ('45도 엘보(S)', '40A', 1820),
    ('45도 엘보(S)', '50A', 1830),
    ('티(S)', '25A X 25A', 1900),
    ('티(S)', '32A X 25A', 1910),
    ('티(S)', '32A X 32A', 1920),
    ('티(S)', '40A X 25A', 1930),
    ('티(S)', '40A X 32A', 1940),
    ('티(S)', '40A X 40A', 1950),
    ('티(S)', '50A X 25A', 1960),
    ('티(S)', '50A X 32A', 1970),
    ('티(S)', '50A X 50A', 1980),
    ('레듀샤(S)', '25AX15A', 2000),
    ('레듀샤(S)', '32AX25A', 2010),
    ('레듀샤(S)', '40AX25A', 2020),
    ('레듀샤(S)', '40AX32A', 2030),
    ('레듀샤(S)', '50AX25A', 2040),
    ('레듀샤(S)', '50AX32A', 2050),
    ('레듀샤(S)', '50AX40A', 2060),
    ('주물소켓 (S)', '25A', 2100),
    ('주물소켓 (S)', '32A', 2110),
    ('주물소켓 (S)', '40A', 2120),
    ('주물소켓 (S)', '50A', 2130),
    ('주물소켓 (S)', '65A', 2140),
    ('CAP(S)', '25A', 2200),
    ('CAP(S)', '32A', 2210),
    ('CAP(S)', '40A', 2220),
    ('CAP(S)', '50A', 2230),
    ('장니플', '25A X 100L', 2300),
    ('베벨엘보', '50A', 2400),
    ('베벨엘보', '65A', 2410),
    ('베벨엘보', '80A', 2420),
    ('베벨티 (A)', '50A', 2500),
    ('베벨티 (A)', '65A', 2510),
    ('베벨티 (A)', '80A', 2520),
    ('베벨티 (B)', '50A', 2600),
    ('베벨티 (B)', '65A', 2610),
    ('베벨티 (B)', '80A', 2620),
    ('개선각', '25A', 2700),
    ('개선각', '32A', 2710),
    ('개선각', '40A', 2720),
    ('개선각', '50A', 2730),
    ('개선각', '65A', 2740),
    ('개선각', '80A', 2750)
),
disabled_old_items AS (
  UPDATE public.inventory_material_items item
  SET
    is_active = false,
    is_default = false,
    updated_at = now()
  WHERE item.material_type = 'subsidiary'
    AND NOT EXISTS (
      SELECT 1
      FROM new_subsidiary_items next_item
      WHERE next_item.material_group = item.material_group
        AND next_item.spec = item.spec
    )
  RETURNING item.id
),
disabled_old_company_items AS (
  UPDATE public.inventory_company_material_items company_item
  SET
    is_active = false,
    updated_at = now()
  FROM public.inventory_material_items item
  WHERE company_item.material_type = 'subsidiary'
    AND company_item.material_item_id = item.id
    AND item.material_type = 'subsidiary'
    AND NOT EXISTS (
      SELECT 1
      FROM new_subsidiary_items next_item
      WHERE next_item.material_group = item.material_group
        AND next_item.spec = item.spec
    )
  RETURNING company_item.id
),
upserted_items AS (
  INSERT INTO public.inventory_material_items
    (category, material_type, material_group, name, spec, unit, sort_order, is_active, is_default)
  SELECT
    'fitting',
    'subsidiary',
    material_group,
    material_group,
    spec,
    'EA',
    sort_order,
    true,
    true
  FROM new_subsidiary_items
  ON CONFLICT (category, material_type, material_group, name, spec)
  DO UPDATE SET
    unit = EXCLUDED.unit,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    is_default = true,
    updated_at = now()
  RETURNING id, sort_order
)
INSERT INTO public.inventory_company_material_items
  (company_id, material_item_id, material_type, sort_order, is_active)
SELECT
  company.id,
  item.id,
  'subsidiary',
  item.sort_order,
  true
FROM public.company_list company
CROSS JOIN upserted_items item
ON CONFLICT (company_id, material_item_id)
DO UPDATE SET
  material_type = EXCLUDED.material_type,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

DELETE FROM public.inventory_material_items item
WHERE item.material_type = 'subsidiary'
  AND item.is_active = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_transaction_items tx
    WHERE tx.material_item_id = item.id
  );

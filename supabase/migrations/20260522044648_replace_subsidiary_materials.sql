WITH new_subsidiary_items(material_group, spec, sort_order) AS (
  VALUES
    ('EL (나사)', '25A', 1000),
    ('EL (나사)', '32A', 1010),
    ('EL (나사)', '40A', 1020),
    ('EL (나사)', '40A*20A', 1030),
    ('EL (나사)', '40A*25A', 1040),
    ('EL (용접)', '25A', 1100),
    ('EL (용접)', '32A', 1110),
    ('EL (용접)', '40A', 1120),
    ('EL (용접)', '50A', 1130),
    ('EL (용접)', '65A', 1140),
    ('EL (용접)', '80A', 1150),
    ('EL (용접)', '100A', 1160),
    ('EL (용접)', '125A', 1170),
    ('EL (용접)', '150A', 1180),
    ('EL (용접) 45도', '25A', 1200),
    ('EL (용접) 45도', '32A', 1210),
    ('EL (용접) 45도', '40A', 1220),
    ('EL (용접) 45도', '50A', 1230),
    ('EL (용접) 45도', '65A', 1240),
    ('EL (용접) 45도', '80A', 1250),
    ('EL (용접) 45도', '150A', 1260),
    ('EL (나사) 45도', '25A', 1300),
    ('TEE (나사)', '25A', 1400),
    ('TEE (나사)', '32A*25A', 1410),
    ('TEE (나사)', '32A', 1420),
    ('TEE (나사)', '40A*25A', 1430),
    ('TEE (나사)', '40A*32A', 1440),
    ('TEE (나사)', '40A', 1450),
    ('TEE (나사)', '50A*25A', 1460),
    ('TEE (나사)', '50A*40A', 1470),
    ('TEE (나사)', '50A', 1480),
    ('TEE (용접)', '80A', 1500),
    ('TEE (용접)', '100A', 1510),
    ('TEE (용접)', '125A', 1520),
    ('TEE (용접)', '150A', 1530),
    ('레듀샤 (나사)', '32A*25A', 1600),
    ('레듀샤 (나사)', '40A*25A', 1610),
    ('레듀샤 (나사)', '40A*32A', 1620),
    ('레듀샤 (나사)', '50A*25A', 1630),
    ('레듀샤 (나사)', '50A*32A', 1640),
    ('레듀샤 (나사)', '50A*40A', 1650),
    ('레듀샤 (용접)', '100A*25A', 1700),
    ('레듀샤 (용접)', '100A*32A', 1710),
    ('레듀샤 (용접)', '100A*40A', 1720),
    ('레듀샤 (용접)', '125A*80A', 1730),
    ('레듀샤 (용접)', '150A*100A', 1740),
    ('주물소켓', '25A', 1800),
    ('주물소켓', '32A', 1810),
    ('주물소켓', '40A', 1820),
    ('주물소켓', '50A', 1830),
    ('철소켓', '25A', 1900),
    ('장니쁠', '20A', 2000),
    ('장니쁠', '25A', 2010),
    ('장니쁠', '32A', 2020),
    ('장니쁠', '40A', 2030),
    ('장니쁠', '50A', 2040),
    ('편니쁠', '15A*42L', 2100),
    ('편니쁠', '25A*42L', 2110),
    ('편니쁠', '40A*135L', 2120),
    ('편니쁠', '40A*200L', 2130),
    ('편니쁠', '50A*135L', 2140),
    ('편니쁠', '65A*200L', 2150),
    ('후렌지 (용접)', '50A', 2200),
    ('후렌지 (용접)', '65A', 2210),
    ('후렌지 (용접)', '80A', 2220),
    ('후렌지 (용접)', '100A', 2230),
    ('후렌지 (용접)', '150A', 2240),
    ('CAP (나사)', '25A', 2300),
    ('CAP (나사)', '32A', 2310),
    ('CAP (나사)', '40A', 2320),
    ('CAP (나사)', '50A', 2330),
    ('CAP (용접)', '25A', 2400),
    ('CAP (용접)', '32A', 2410),
    ('CAP (용접)', '40A', 2420),
    ('CAP (용접)', '80A', 2430),
    ('CAP (용접)', '100A', 2440),
    ('CAP (용접)', '125A', 2450)
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
    false
  FROM new_subsidiary_items
  ON CONFLICT (category, material_type, material_group, name, spec)
  DO UPDATE SET
    unit = EXCLUDED.unit,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    is_default = false,
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

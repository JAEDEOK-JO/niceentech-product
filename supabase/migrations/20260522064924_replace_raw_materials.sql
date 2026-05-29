WITH new_raw_items(material_group, spec, sort_order) AS (
  VALUES
    ('일반강관', '25A', 10),
    ('일반강관', '32A', 20),
    ('일반강관', '40A', 30),
    ('일반강관', '50A', 40),
    ('일반강관', '65A', 50),
    ('일반강관', '80A', 60),
    ('일반강관', '100A', 70),
    ('일반강관', '125A', 80),
    ('일반강관', '150A', 90),
    ('스케쥴', '100A', 100),
    ('스케쥴', '125A', 110),
    ('스케쥴', '150A', 120),
    ('수파이프', '15S', 200),
    ('수파이프', '20S', 210),
    ('수파이프', '25S', 220),
    ('수파이프', '40S', 230),
    ('수파이프', '50S', 240),
    ('수파이프', '60S', 250),
    ('수파이프', '80S', 260),
    ('수파이프', '100S', 270),
    ('수파이프', '125S', 280),
    ('수파이프', '150S', 290),
    ('써스', '15S', 300),
    ('써스', '20S', 310),
    ('써스', '25S', 320),
    ('써스', '40S', 330),
    ('써스', '50S', 340),
    ('써스', '60S', 350),
    ('써스', '80S', 360),
    ('써스', '100S', 370),
    ('써스', '125S', 380),
    ('써스', '150S', 390)
),
disabled_old_items AS (
  UPDATE public.inventory_material_items item
  SET
    is_active = false,
    is_default = false,
    updated_at = now()
  WHERE item.material_type = 'raw'
    AND NOT EXISTS (
      SELECT 1
      FROM new_raw_items next_item
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
  WHERE company_item.material_type = 'raw'
    AND company_item.material_item_id = item.id
    AND item.material_type = 'raw'
    AND NOT EXISTS (
      SELECT 1
      FROM new_raw_items next_item
      WHERE next_item.material_group = item.material_group
        AND next_item.spec = item.spec
    )
  RETURNING company_item.id
),
upserted_items AS (
  INSERT INTO public.inventory_material_items
    (category, material_type, material_group, name, spec, unit, sort_order, is_active, is_default)
  SELECT
    'pipe',
    'raw',
    material_group,
    material_group,
    spec,
    '본',
    sort_order,
    true,
    material_group NOT IN ('수파이프', '써스')
  FROM new_raw_items
  ON CONFLICT (category, material_type, material_group, name, spec)
  DO UPDATE SET
    unit = EXCLUDED.unit,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    is_default = EXCLUDED.is_default,
    updated_at = now()
  RETURNING id, sort_order
),
disabled_non_default_company_items AS (
  UPDATE public.inventory_company_material_items company_item
  SET
    is_active = false,
    updated_at = now()
  FROM upserted_items item
  WHERE company_item.material_type = 'raw'
    AND company_item.material_item_id = item.id
    AND item.sort_order >= 200
  RETURNING company_item.id
)
INSERT INTO public.inventory_company_material_items
  (company_id, material_item_id, material_type, sort_order, is_active)
SELECT
  company.id,
  item.id,
  'raw',
  item.sort_order,
  true
FROM public.company_list company
CROSS JOIN upserted_items item
WHERE item.sort_order < 200
ON CONFLICT (company_id, material_item_id)
DO UPDATE SET
  material_type = EXCLUDED.material_type,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

UPDATE public.inventory_material_items
SET
  is_default = true,
  updated_at = now()
WHERE material_type = 'subsidiary'
  AND is_active = true;

INSERT INTO public.inventory_company_material_items
  (company_id, material_item_id, material_type, sort_order, is_active)
SELECT
  company.id,
  item.id,
  'subsidiary',
  item.sort_order,
  true
FROM public.company_list company
JOIN public.inventory_material_items item
  ON item.material_type = 'subsidiary'
 AND item.is_active = true
 AND item.is_default = true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inventory_company_material_items linked
  WHERE linked.company_id = company.id
    AND linked.material_type = 'subsidiary'
    AND linked.is_active = true
)
AND NOT EXISTS (
  SELECT 1
  FROM public.inventory_company_material_items existing
  WHERE existing.company_id = company.id
    AND existing.material_item_id = item.id
)
ON CONFLICT (company_id, material_item_id) DO NOTHING;

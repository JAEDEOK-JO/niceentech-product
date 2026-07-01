ALTER TABLE public.cnc_items
  ADD COLUMN IF NOT EXISTS product_list_id bigint REFERENCES public.product_list(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cnc_items_product_list_id
  ON public.cnc_items (product_list_id)
  WHERE product_list_id IS NOT NULL;

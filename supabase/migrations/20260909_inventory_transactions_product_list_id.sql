ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS product_list_id bigint REFERENCES public.product_list(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.inventory_transactions.product_list_id IS '생산계획 product_list.id입니다. 산출서에서 만든 산출 열을 같은 행에 갱신할 때 사용합니다.';

CREATE UNIQUE INDEX IF NOT EXISTS inventory_transactions_product_type_uidx
  ON public.inventory_transactions (product_list_id, material_type)
  WHERE product_list_id IS NOT NULL;

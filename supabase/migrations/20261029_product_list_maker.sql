ALTER TABLE public.product_list
  ADD COLUMN IF NOT EXISTS maker text;

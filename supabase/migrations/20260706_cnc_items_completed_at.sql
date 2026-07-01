ALTER TABLE public.cnc_items
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

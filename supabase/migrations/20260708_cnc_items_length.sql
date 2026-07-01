ALTER TABLE public.cnc_items
  ADD COLUMN IF NOT EXISTS length integer NOT NULL DEFAULT 0 CHECK (length >= 0);

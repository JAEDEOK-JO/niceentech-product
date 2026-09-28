ALTER TABLE public.shipment_schedule
  ADD COLUMN IF NOT EXISTS initial text;

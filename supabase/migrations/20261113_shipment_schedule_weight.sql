alter table public.shipment_schedule
  add column if not exists weight numeric;

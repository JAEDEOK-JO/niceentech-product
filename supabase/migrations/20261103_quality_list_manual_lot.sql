alter table public.quality_list
  add column if not exists "lot_numH2" text,
  add column if not exists "lot_nameH2" text,
  add column if not exists "lot_number_startH2" text,
  add column if not exists "lot_number_endH2" text;

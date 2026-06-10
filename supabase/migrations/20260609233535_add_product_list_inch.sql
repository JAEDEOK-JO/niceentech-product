alter table public.product_list
  add column if not exists inch double precision;

comment on column public.product_list.inch is '인치 숫자';

notify pgrst, 'reload schema';

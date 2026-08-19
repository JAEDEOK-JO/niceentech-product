alter table public.product_list
  add column if not exists nasa_mark boolean not null default false;

comment on column public.product_list.nasa_mark is '나사 표시 여부';

notify pgrst, 'reload schema';

alter table public.product_list
  add column if not exists shipment_spec_remarks jsonb not null default '[]'::jsonb;

alter table public.product_list
  add column if not exists shipment_spec_landscape boolean not null default false;

comment on column public.product_list.shipment_spec_remarks is '출하명세서 특이사항 출력값';
comment on column public.product_list.shipment_spec_landscape is '출하명세서 가로 출력 여부';

notify pgrst, 'reload schema';

create table if not exists public.spmt_item (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  sku text,
  unit text not null default '개',
  quantity numeric(14, 2) not null default 0,
  safety_quantity numeric(14, 2) not null default 0,
  memo text,
  created_by uuid references public.profiles (id) on delete set null,
  constraint spmt_item_quantity_check check (quantity >= 0),
  constraint spmt_item_safety_quantity_check check (safety_quantity >= 0)
);

create table if not exists public.spmt_stock_move (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  item_id bigint not null references public.spmt_item (id) on delete cascade,
  direction text not null,
  quantity numeric(14, 2) not null,
  memo text,
  created_by uuid references public.profiles (id) on delete set null,
  constraint spmt_stock_move_direction_check check (direction in ('in', 'out')),
  constraint spmt_stock_move_quantity_check check (quantity > 0)
);

create index if not exists spmt_item_name_idx
  on public.spmt_item (name);

create unique index if not exists spmt_item_sku_idx
  on public.spmt_item (sku)
  where sku is not null and btrim(sku) <> '';

create index if not exists spmt_stock_move_item_id_idx
  on public.spmt_stock_move (item_id);

create index if not exists spmt_stock_move_created_at_idx
  on public.spmt_stock_move (created_at desc);

create or replace function public.spmt_apply_stock_move()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_quantity numeric(14, 2);
begin
  select quantity
    into current_quantity
  from public.spmt_item
  where id = new.item_id
  for update;

  if not found then
    raise exception 'item_not_found';
  end if;

  if new.direction = 'out' and current_quantity < new.quantity then
    raise exception 'insufficient_stock';
  end if;

  update public.spmt_item
    set quantity = case
      when new.direction = 'in' then current_quantity + new.quantity
      else current_quantity - new.quantity
    end
  where id = new.item_id;

  return new;
end;
$$;

drop trigger if exists spmt_stock_move_apply on public.spmt_stock_move;
create trigger spmt_stock_move_apply
  after insert on public.spmt_stock_move
  for each row
  execute function public.spmt_apply_stock_move();

alter table public.spmt_item enable row level security;
alter table public.spmt_stock_move enable row level security;

revoke all on public.spmt_item from public, anon;
revoke all on public.spmt_stock_move from public, anon;
revoke all on function public.spmt_apply_stock_move() from public, anon, authenticated;

grant select, insert, update, delete on public.spmt_item to authenticated;
grant select, insert, update, delete on public.spmt_stock_move to authenticated;
grant usage, select on sequence public.spmt_item_id_seq to authenticated;
grant usage, select on sequence public.spmt_stock_move_id_seq to authenticated;
grant execute on function public.spmt_apply_stock_move() to authenticated;

drop policy if exists spmt_item_select on public.spmt_item;
create policy spmt_item_select
  on public.spmt_item
  for select
  to authenticated
  using (true);

drop policy if exists spmt_item_insert on public.spmt_item;
create policy spmt_item_insert
  on public.spmt_item
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists spmt_item_update on public.spmt_item;
create policy spmt_item_update
  on public.spmt_item
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists spmt_item_delete on public.spmt_item;
create policy spmt_item_delete
  on public.spmt_item
  for delete
  to authenticated
  using (true);

drop policy if exists spmt_stock_move_select on public.spmt_stock_move;
create policy spmt_stock_move_select
  on public.spmt_stock_move
  for select
  to authenticated
  using (true);

drop policy if exists spmt_stock_move_insert on public.spmt_stock_move;
create policy spmt_stock_move_insert
  on public.spmt_stock_move
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists spmt_stock_move_update on public.spmt_stock_move;
create policy spmt_stock_move_update
  on public.spmt_stock_move
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists spmt_stock_move_delete on public.spmt_stock_move;
create policy spmt_stock_move_delete
  on public.spmt_stock_move
  for delete
  to authenticated
  using (true);

grant select on public.spmt_item to chatbot_reader;
grant select on public.spmt_stock_move to chatbot_reader;

drop policy if exists chatbot_reader_read on public.spmt_item;
create policy chatbot_reader_read
  on public.spmt_item
  for select
  to chatbot_reader
  using (true);

drop policy if exists chatbot_reader_read on public.spmt_stock_move;
create policy chatbot_reader_read
  on public.spmt_stock_move
  for select
  to chatbot_reader
  using (true);

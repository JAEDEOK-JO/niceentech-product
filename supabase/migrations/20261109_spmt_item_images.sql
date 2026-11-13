alter table public.spmt_item
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'spmt_item_images',
  'spmt_item_images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists spmt_item_images_select on storage.objects;
create policy spmt_item_images_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'spmt_item_images');

drop policy if exists spmt_item_images_insert on storage.objects;
create policy spmt_item_images_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'spmt_item_images'
    and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists spmt_item_images_update on storage.objects;
create policy spmt_item_images_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'spmt_item_images')
  with check (
    bucket_id = 'spmt_item_images'
    and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists spmt_item_images_delete on storage.objects;
create policy spmt_item_images_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'spmt_item_images');

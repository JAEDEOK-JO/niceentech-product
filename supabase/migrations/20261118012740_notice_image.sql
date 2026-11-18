alter table public.worker_notices
  add column if not exists image_path text;

alter table public.worker_notices
  drop constraint if exists worker_notices_image_path_check;

alter table public.worker_notices
  add constraint worker_notices_image_path_check
  check (image_path is null or char_length(btrim(image_path)) > 0);

create or replace function public.guard_worker_notice_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  actor_can_post boolean;
begin
  if tg_op = 'DELETE' then
    if session_user in ('postgres', 'supabase_admin') then
      return old;
    end if;
    select exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    ) into actor_can_post;
    if not actor_can_post then
      raise exception 'notice_forbidden';
    end if;
    return old;
  end if;

  new.body := nullif(btrim(coalesce(new.body, '')), '');
  new.image_path := nullif(btrim(coalesce(new.image_path, '')), '');
  if new.body is null then
    raise exception 'notice_forbidden';
  end if;

  if session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('super_admin', 'admin', '관리자')
  ) into actor_can_post;

  if not actor_can_post then
    raise exception 'notice_forbidden';
  end if;

  if new.image_path is not null and new.image_path !~ (
    '^' || auth.uid()::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$'
  ) then
    raise exception 'notice_forbidden';
  end if;

  new.created_by := auth.uid();
  return new;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-notices',
  'worker-notices',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists worker_notices_storage_select on storage.objects;
create policy worker_notices_storage_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'worker-notices');

drop policy if exists worker_notices_storage_insert on storage.objects;
create policy worker_notices_storage_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'worker-notices'
    and (storage.foldername(name))[1] = auth.uid()::text
    and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    )
  );

drop policy if exists worker_notices_storage_delete on storage.objects;
create policy worker_notices_storage_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'worker-notices'
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    )
  );

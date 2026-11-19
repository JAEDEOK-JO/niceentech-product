alter table public.worker_notices
  add column if not exists translations jsonb not null default '{}'::jsonb;

create or replace function public.normalize_notice_translations(value jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '{}'::jsonb;
  key text;
  item text;
begin
  if value is null or jsonb_typeof(value) <> 'object' then
    return result;
  end if;

  for key, item in
    select entry.key, entry.value
    from jsonb_each_text(value) as entry
  loop
    if key in ('en', 'vi', 'th', 'ru', 'ur') then
      item := nullif(btrim(item), '');
      if item is not null then
        result := result || jsonb_build_object(key, item);
      end if;
    end if;
  end loop;

  return result;
end;
$$;

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
  if new.body is null then
    raise exception 'notice_forbidden';
  end if;

  new.requires_check := coalesce(new.requires_check, true);
  new.translations := public.normalize_notice_translations(new.translations);

  select coalesce(array_agg(path order by ord), '{}'::text[])
    into new.image_paths
  from (
    select path, min(ord) as ord
    from (
      select nullif(btrim(item), '') as path, ordinality as ord
      from unnest(
        coalesce(new.image_paths, '{}'::text[])
        || case
          when nullif(btrim(coalesce(new.image_path, '')), '') is null then '{}'::text[]
          else array[btrim(new.image_path)]
        end
      ) with ordinality as listed(item, ordinality)
    ) cleaned
    where path is not null
    group by path
  ) unique_paths;

  if coalesce(cardinality(new.image_paths), 0) > 2 then
    raise exception 'notice_forbidden';
  end if;

  new.image_path := nullif(new.image_paths[1], '');
  if coalesce(cardinality(new.image_paths), 0) = 0 then
    new.image_paths := null;
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

  if exists (
    select 1
    from unnest(coalesce(new.image_paths, '{}'::text[])) as path
    where path !~ ('^' || auth.uid()::text || '/[0-9a-fA-F-]{36}\.(jpg|jpeg|png|webp)$')
  ) then
    raise exception 'notice_forbidden';
  end if;

  new.created_by := auth.uid();
  return new;
end;
$$;

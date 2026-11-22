create or replace function public.normalize_notice_translations(value jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '{}'::jsonb;
  key text;
  item jsonb;
  body text;
begin
  if value is null or jsonb_typeof(value) <> 'object' then
    return result;
  end if;

  for key, item in
    select entry.key, entry.value
    from jsonb_each(value) as entry
  loop
    if key not in ('lo', 'my', 'th', 'en', 'ru', 'vi', 'ur', 'bn') then
      continue;
    end if;

    if jsonb_typeof(item) = 'string' then
      body := nullif(btrim(item #>> '{}'), '');
    elsif jsonb_typeof(item) = 'object' then
      body := nullif(btrim(coalesce(item->>'body', '')), '');
    else
      continue;
    end if;

    if body is null then
      continue;
    end if;

    result := result || jsonb_build_object(key, to_jsonb(body));
  end loop;

  return result;
end;
$$;

create or replace function public.guard_worker_notice_pin()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  actor_can_post boolean;
  pinned_count integer;
begin
  new.translations := public.normalize_notice_translations(new.translations);

  if tg_op = 'UPDATE' and session_user not in ('postgres', 'supabase_admin') then
    select exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    ) into actor_can_post;
    if not actor_can_post then
      raise exception 'notice_forbidden';
    end if;
    if (to_jsonb(new) - 'pinned' - 'pinned_at' - 'translations')
      is distinct from (to_jsonb(old) - 'pinned' - 'pinned_at' - 'translations') then
      raise exception 'notice_forbidden';
    end if;
  end if;

  new.pinned := coalesce(new.pinned, false);

  if new.pinned and tg_op = 'UPDATE' and old.pinned then
    new.pinned_at := old.pinned_at;
    return new;
  end if;

  if not new.pinned then
    new.pinned_at := null;
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('public.worker_notices.pin'));

  select count(*)::integer
    into pinned_count
  from public.worker_notices
  where pinned
    and id is distinct from new.id;

  if pinned_count >= 5 then
    raise exception 'notice_pin_limit';
  end if;

  new.pinned_at := now();
  return new;
end;
$$;

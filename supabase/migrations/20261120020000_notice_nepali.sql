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
    if key not in ('lo', 'my', 'th', 'en', 'ru', 'vi', 'ur', 'bn', 'ne') then
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

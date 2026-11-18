create or replace function public.guard_worker_reward_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  actor_is_admin boolean;
begin
  if tg_op = 'DELETE' then
    if old.status = '승인' then
      raise exception 'reward_forbidden';
    end if;
    if session_user in ('postgres', 'supabase_admin') then
      return old;
    end if;
    if old.user_id is distinct from auth.uid()
       and not public.can_review_worker_reward(auth.uid()) then
      raise exception 'reward_forbidden';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.photo_paths is null and new.photo_path is not null then
      new.photo_paths := array[new.photo_path];
    end if;
    if new.photo_paths is not null and cardinality(new.photo_paths) = 0 then
      new.photo_paths := null;
    end if;
    if new.normal_photo_paths is not null and cardinality(new.normal_photo_paths) = 0 then
      new.normal_photo_paths := null;
    end if;
    new.original_note := nullif(btrim(coalesce(new.original_note, '')), '');
    new.found_note := nullif(btrim(coalesce(new.found_note, '')), '');
    new.photo_path := case
      when new.photo_paths is null then null
      else new.photo_paths[1]
    end;

    if session_user in ('postgres', 'supabase_admin') then
      new.amount := 2000;
      if new.status is null or new.status not in ('대기', '승인', '반려') then
        new.status := '대기';
      end if;
      return new;
    end if;

    if new.found_note is null
       or (new.photo_paths is not null and cardinality(new.photo_paths) > 3)
       or (new.normal_photo_paths is not null and cardinality(new.normal_photo_paths) > 3) then
      raise exception 'reward_forbidden';
    end if;

    new.user_id := auth.uid();
    new.status := '대기';
    new.amount := 2000;
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;

  if session_user not in ('postgres', 'supabase_admin')
     and auth.uid() = old.user_id
     and (
       new.user_id is distinct from old.user_id
       or new.photo_path is distinct from old.photo_path
       or new.photo_paths is distinct from old.photo_paths
       or new.normal_photo_paths is distinct from old.normal_photo_paths
       or new.original_note is distinct from old.original_note
       or new.found_note is distinct from old.found_note
       or new.amount is distinct from old.amount
       or new.created_at is distinct from old.created_at
       or not public.can_review_worker_reward(auth.uid())
     ) then
    if old.status = '승인' then
      raise exception 'reward_forbidden';
    end if;

    if new.photo_paths is null and new.photo_path is not null then
      new.photo_paths := array[new.photo_path];
    end if;
    if new.photo_paths is not null and cardinality(new.photo_paths) = 0 then
      new.photo_paths := null;
    end if;
    if new.normal_photo_paths is not null and cardinality(new.normal_photo_paths) = 0 then
      new.normal_photo_paths := null;
    end if;
    new.original_note := nullif(btrim(coalesce(new.original_note, '')), '');
    new.found_note := nullif(btrim(coalesce(new.found_note, '')), '');
    new.photo_path := case
      when new.photo_paths is null then null
      else new.photo_paths[1]
    end;

    if new.found_note is null
       or (new.photo_paths is not null and cardinality(new.photo_paths) > 3)
       or (new.normal_photo_paths is not null and cardinality(new.normal_photo_paths) > 3) then
      raise exception 'reward_forbidden';
    end if;

    new.user_id := old.user_id;
    new.created_at := old.created_at;
    new.amount := old.amount;
    new.status := '대기';
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;

  if session_user not in ('postgres', 'supabase_admin')
     and public.can_review_worker_reward(auth.uid())
     and old.status <> '승인'
     and (
       new.photo_path is distinct from old.photo_path
       or new.photo_paths is distinct from old.photo_paths
       or new.normal_photo_paths is distinct from old.normal_photo_paths
       or new.original_note is distinct from old.original_note
       or new.found_note is distinct from old.found_note
     ) then
    if new.photo_paths is null and new.photo_path is not null then
      new.photo_paths := array[new.photo_path];
    end if;
    if new.photo_paths is not null and cardinality(new.photo_paths) = 0 then
      new.photo_paths := null;
    end if;
    if new.normal_photo_paths is not null and cardinality(new.normal_photo_paths) = 0 then
      new.normal_photo_paths := null;
    end if;
    new.original_note := nullif(btrim(coalesce(new.original_note, '')), '');
    new.found_note := nullif(btrim(coalesce(new.found_note, '')), '');
    new.photo_path := case
      when new.photo_paths is null then null
      else new.photo_paths[1]
    end;

    if new.found_note is null
       or new.user_id is distinct from old.user_id
       or new.amount is distinct from old.amount
       or new.created_at is distinct from old.created_at
       or (new.photo_paths is not null and cardinality(new.photo_paths) > 3)
       or (new.normal_photo_paths is not null and cardinality(new.normal_photo_paths) > 3) then
      raise exception 'reward_forbidden';
    end if;

    new.user_id := old.user_id;
    new.created_at := old.created_at;
    new.amount := old.amount;
    new.status := '대기';
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.photo_path is distinct from old.photo_path
     or new.photo_paths is distinct from old.photo_paths
     or new.normal_photo_paths is distinct from old.normal_photo_paths
     or new.original_note is distinct from old.original_note
     or new.found_note is distinct from old.found_note
     or new.amount is distinct from old.amount
     or new.created_at is distinct from old.created_at then
    raise exception 'reward_forbidden';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  select public.can_review_worker_reward(auth.uid()) into actor_is_admin;

  if not actor_is_admin or new.status not in ('승인', '반려') then
    raise exception 'reward_forbidden';
  end if;

  new.reviewed_at := now();
  new.reviewed_by := auth.uid();
  return new;
end;
$$;

drop policy if exists worker_reward_reports_delete on public.worker_reward_reports;
create policy worker_reward_reports_delete
  on public.worker_reward_reports
  for delete
  to authenticated
  using (
    status <> '승인'
    and (
      user_id = auth.uid()
      or public.can_review_worker_reward(auth.uid())
    )
  );

drop policy if exists worker_rewards_delete on storage.objects;
create policy worker_rewards_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'worker-rewards'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_review_worker_reward(auth.uid())
    )
  );

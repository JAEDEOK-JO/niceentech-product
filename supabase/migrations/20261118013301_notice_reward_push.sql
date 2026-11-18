create or replace function public.notify_worker_notice_fcm()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  recipient uuid;
  notice_body text;
begin
  notice_body := left(btrim(coalesce(new.body, '')), 120);
  if notice_body = '' then
    return new;
  end if;

  for recipient in
    select id
    from public.profiles
    where role::text = '작업자'
      and activate is distinct from false
      and id is distinct from new.created_by
  loop
    perform public.dispatch_fcm_push(recipient, '공지사항', notice_body, '/worker');
  end loop;

  return new;
end;
$$;

revoke all on function public.notify_worker_notice_fcm() from public, anon, authenticated;

drop trigger if exists worker_notices_notify_fcm on public.worker_notices;
create trigger worker_notices_notify_fcm
  after insert on public.worker_notices
  for each row
  execute function public.notify_worker_notice_fcm();

create or replace function public.notify_worker_reward_fcm()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  recipient uuid;
  worker_name text;
  note text;
begin
  if tg_op = 'INSERT'
    or (tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = '대기')
  then
    select coalesce(nullif(btrim(name), ''), '작업자')
      into worker_name
    from public.profiles
    where id = new.user_id;

    note := left(btrim(coalesce(new.found_note, '')), 80);

    for recipient in
      select id
      from public.profiles
      where public.can_review_worker_reward(id)
        and activate is distinct from false
        and id is distinct from new.user_id
    loop
      perform public.dispatch_fcm_push(
        recipient,
        '포상',
        worker_name || case when note = '' then '' else ' · ' || note end,
        '/reward'
      );
    end loop;
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status in ('승인', '반려')
  then
    perform public.dispatch_fcm_push(
      new.user_id,
      '포상',
      new.status,
      '/worker?tab=reward'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_worker_reward_fcm() from public, anon, authenticated;

drop trigger if exists worker_reward_reports_notify_fcm on public.worker_reward_reports;
create trigger worker_reward_reports_notify_fcm
  after insert or update on public.worker_reward_reports
  for each row
  execute function public.notify_worker_reward_fcm();

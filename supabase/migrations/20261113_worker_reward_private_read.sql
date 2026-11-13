drop policy if exists worker_reward_reports_select on public.worker_reward_reports;
create policy worker_reward_reports_select
  on public.worker_reward_reports
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role::text in ('super_admin', 'admin', '관리자')
    )
  );

drop policy if exists worker_rewards_select on storage.objects;
create policy worker_rewards_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'worker-rewards'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role::text in ('super_admin', 'admin', '관리자')
      )
    )
  );

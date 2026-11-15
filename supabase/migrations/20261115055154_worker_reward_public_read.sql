drop policy if exists worker_reward_reports_select on public.worker_reward_reports;
create policy worker_reward_reports_select
  on public.worker_reward_reports
  for select
  to authenticated
  using (true);

drop policy if exists worker_rewards_select on storage.objects;
create policy worker_rewards_select
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'worker-rewards');

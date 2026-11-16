create table if not exists public.chatbot_runs (
  id uuid primary key,
  user_id uuid not null,
  stopped boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.chatbot_runs enable row level security;

drop policy if exists chatbot_runs_own on public.chatbot_runs;
create policy chatbot_runs_own
  on public.chatbot_runs
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

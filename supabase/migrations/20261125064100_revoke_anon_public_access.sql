set local lock_timeout = '5s';

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.setting to anon;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

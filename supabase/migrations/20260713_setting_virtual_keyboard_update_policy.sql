drop policy if exists setting_authenticated_update on public.setting;

create policy setting_authenticated_update
on public.setting
for update
to authenticated
using (true)
with check (true);

alter table public.setting
add column if not exists virtual_keyboard_enabled boolean not null default false;

comment on column public.setting.virtual_keyboard_enabled is '웹 검색창 가상키보드 사용 여부 (전역, 기본 오프)';

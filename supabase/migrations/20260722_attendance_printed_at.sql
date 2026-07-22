-- 근태 신청 인쇄 완료 시각
alter table public.attendance_requests
  add column if not exists printed_at timestamptz null;

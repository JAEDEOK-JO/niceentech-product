CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id bigserial PRIMARY KEY,
  employee_code text NOT NULL,
  raw_name text,
  work_date date NOT NULL,
  clock_in time,
  clock_out time,
  work_seconds integer NOT NULL DEFAULT 0,
  tardy_seconds integer NOT NULL DEFAULT 0,
  early_leave_seconds integer NOT NULL DEFAULT 0,
  department text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_code, work_date)
);

CREATE INDEX IF NOT EXISTS attendance_logs_work_date_idx ON public.attendance_logs(work_date);
CREATE INDEX IF NOT EXISTS attendance_logs_employee_code_idx ON public.attendance_logs(employee_code);

COMMENT ON TABLE public.attendance_logs IS '근태관리 엑셀 업로드 원본 로그 (출/퇴근 기계 데이터)';
COMMENT ON COLUMN public.attendance_logs.work_seconds IS '휴게시간(점심1h+쉬는시간30m+저녁30m = 2h) 제외 근무시간(초)';
COMMENT ON COLUMN public.attendance_logs.tardy_seconds IS '음수=조기출근(Good), 양수=지각(Bad) 단위 초';
COMMENT ON COLUMN public.attendance_logs.early_leave_seconds IS '음수=정시출근 대비 일찍퇴근(Bad), 양수=초과근무(Good) 단위 초';

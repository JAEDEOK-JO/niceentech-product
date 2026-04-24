ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS remaining_annual_leave_count integer NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS hourly_wage integer NOT NULL DEFAULT 10000;

UPDATE public.employees
SET
  remaining_annual_leave_count = COALESCE(remaining_annual_leave_count, 10),
  hourly_wage = ((floor(random() * 51)::integer * 100) + 10000)
WHERE hourly_wage IS NULL
   OR hourly_wage = 10000
   OR remaining_annual_leave_count IS NULL;

COMMENT ON COLUMN public.employees.remaining_annual_leave_count IS '남은 연차 횟수';
COMMENT ON COLUMN public.employees.hourly_wage IS '시급(원)';

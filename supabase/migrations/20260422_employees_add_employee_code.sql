ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_code text;
CREATE UNIQUE INDEX IF NOT EXISTS employees_employee_code_key ON public.employees(employee_code) WHERE employee_code IS NOT NULL;
COMMENT ON COLUMN public.employees.employee_code IS '출퇴근 기계 사번 (8자리 숫자, 예: 00000085)';

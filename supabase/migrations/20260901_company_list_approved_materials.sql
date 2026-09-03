ALTER TABLE public.company_list
  ADD COLUMN IF NOT EXISTS approved_materials text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.company_list.approved_materials IS '현장 승인자재 브랜드 목록';

CREATE INDEX IF NOT EXISTS company_list_approved_materials_gin
  ON public.company_list
  USING gin (approved_materials);

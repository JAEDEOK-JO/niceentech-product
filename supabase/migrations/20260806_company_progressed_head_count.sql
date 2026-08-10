-- 진행된 헤드수량: 출하완료 product_list.head 누적
ALTER TABLE public.company_list
  ADD COLUMN IF NOT EXISTS progressed_head_count bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.company_list.progressed_head_count IS '진행된 헤드수량 (출하완료 product_list.head 합계)';

-- 기존 출하완료 데이터로 백필
UPDATE public.company_list c
SET progressed_head_count = COALESCE(s.total_head, 0)
FROM (
  SELECT
    company_info AS id,
    SUM(COALESCE(head, 0))::bigint AS total_head
  FROM public.product_list
  WHERE shipment IS TRUE
    AND company_info IS NOT NULL
  GROUP BY company_info
) s
WHERE c.id = s.id;

UPDATE public.company_list
SET progressed_head_count = 0
WHERE id NOT IN (
  SELECT DISTINCT company_info
  FROM public.product_list
  WHERE shipment IS TRUE
    AND company_info IS NOT NULL
);

CREATE OR REPLACE FUNCTION public.sync_company_progressed_head_from_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_active boolean := false;
  new_active boolean := false;
  old_company bigint;
  new_company bigint;
  old_head bigint := 0;
  new_head bigint := 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.shipment, false) AND OLD.company_info IS NOT NULL THEN
      UPDATE public.company_list
      SET progressed_head_count = GREATEST(0, COALESCE(progressed_head_count, 0) - COALESCE(OLD.head, 0))
      WHERE id = OLD.company_info;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.shipment, false) AND NEW.company_info IS NOT NULL THEN
      UPDATE public.company_list
      SET progressed_head_count = COALESCE(progressed_head_count, 0) + COALESCE(NEW.head, 0)
      WHERE id = NEW.company_info;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: 이전 기여분 제거 후 새 기여분 반영 (shipment / head / company_info 변경 대응)
  old_active := COALESCE(OLD.shipment, false);
  new_active := COALESCE(NEW.shipment, false);
  old_company := OLD.company_info;
  new_company := NEW.company_info;
  old_head := COALESCE(OLD.head, 0);
  new_head := COALESCE(NEW.head, 0);

  IF old_active AND old_company IS NOT NULL THEN
    UPDATE public.company_list
    SET progressed_head_count = GREATEST(0, COALESCE(progressed_head_count, 0) - old_head)
    WHERE id = old_company;
  END IF;

  IF new_active AND new_company IS NOT NULL THEN
    UPDATE public.company_list
    SET progressed_head_count = COALESCE(progressed_head_count, 0) + new_head
    WHERE id = new_company;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_company_progressed_head ON public.product_list;

CREATE TRIGGER trg_sync_company_progressed_head
AFTER INSERT OR UPDATE OF shipment, head, company_info OR DELETE
ON public.product_list
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_progressed_head_from_product();

CREATE TABLE IF NOT EXISTS public.drawing_file_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_list_id bigint NOT NULL,
  file_name text NOT NULL DEFAULT '',
  action text NOT NULL CHECK (action IN ('registered', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drawing_file_history_product_idx
  ON public.drawing_file_history (product_list_id, created_at DESC, id DESC);

ALTER TABLE public.drawing_file_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drawing_file_history_select ON public.drawing_file_history;
CREATE POLICY drawing_file_history_select
  ON public.drawing_file_history FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON public.drawing_file_history FROM anon, authenticated;
GRANT SELECT ON public.drawing_file_history TO authenticated;

CREATE OR REPLACE FUNCTION public.record_drawing_file_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.product_list_id IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.drawing_file_history (product_list_id, file_name, action, created_at)
    VALUES (NEW.product_list_id, coalesce(NEW.name, ''), 'registered', coalesce(NEW.created_at, now()));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.product_list_id IS NULL THEN
      RETURN OLD;
    END IF;
    INSERT INTO public.drawing_file_history (product_list_id, file_name, action)
    VALUES (OLD.product_list_id, coalesce(OLD.name, ''), 'deleted');
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS drawing_pdf_file_history ON public.drawing_pdf;
CREATE TRIGGER drawing_pdf_file_history
  AFTER INSERT OR DELETE ON public.drawing_pdf
  FOR EACH ROW
  EXECUTE FUNCTION public.record_drawing_file_history();

INSERT INTO public.drawing_file_history (product_list_id, file_name, action, created_at)
SELECT product_list_id, coalesce(name, ''), 'registered', coalesce(created_at, now())
FROM public.drawing_pdf
WHERE product_list_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.drawing_file_history);

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.drawing_pdf
  ADD COLUMN IF NOT EXISTS quantity_state text,
  ADD COLUMN IF NOT EXISTS quantity_message text;

INSERT INTO public.system_push_config (key, value)
VALUES
  (
    'functions_register_drawing_quality_url',
    'https://joxfohziazjhscewifjj.supabase.co/functions/v1/register-drawing-quality'
  ),
  ('drawing_quality_webhook_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dispatch_drawing_quality_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  IF coalesce(NEW.name, '') !~* '\.pdf$' THEN
    RETURN NEW;
  END IF;

  IF NEW.product_list_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_url
  FROM public.system_push_config
  WHERE key = 'functions_register_drawing_quality_url';

  SELECT value INTO v_secret
  FROM public.system_push_config
  WHERE key = 'drawing_quality_webhook_secret';

  IF coalesce(v_url, '') = '' OR coalesce(v_secret, '') = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-drawing-quality-secret', v_secret
      ),
      body := jsonb_build_object(
        'productListId', NEW.product_list_id,
        'drawingFileId', NEW.id
      ),
      timeout_milliseconds := 15000
    );
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS drawing_pdf_quality_check ON public.drawing_pdf;

CREATE TRIGGER drawing_pdf_quality_check
  AFTER INSERT ON public.drawing_pdf
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_drawing_quality_check();

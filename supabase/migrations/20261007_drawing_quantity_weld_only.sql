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

  IF NOT EXISTS (
    SELECT 1
    FROM public.product_list
    WHERE id = NEW.product_list_id
      AND replace(coalesce(work_type, ''), ' ', '') = '용접/무용접'
  ) THEN
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

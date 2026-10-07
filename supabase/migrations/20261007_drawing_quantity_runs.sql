CREATE TABLE IF NOT EXISTS public.drawing_quantity_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  drawing_pdf_id bigint REFERENCES public.drawing_pdf(id) ON DELETE CASCADE,
  product_list_id bigint,
  source_path text NOT NULL,
  file_name text,
  insert_quality boolean NOT NULL DEFAULT true,
  state text NOT NULL DEFAULT 'pending',
  start_after timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  page_count integer,
  model text,
  reasoning_effort text,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  shared_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  records jsonb NOT NULL DEFAULT '[]'::jsonb,
  counts jsonb,
  confirmed_total integer,
  uncertain_count integer,
  quality_list_id bigint,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS drawing_quantity_runs_drawing_pdf_id_key
  ON public.drawing_quantity_runs (drawing_pdf_id)
  WHERE drawing_pdf_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS drawing_quantity_runs_active_idx
  ON public.drawing_quantity_runs (state, start_after);

CREATE TABLE IF NOT EXISTS public.drawing_quantity_tasks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id bigint NOT NULL REFERENCES public.drawing_quantity_runs(id) ON DELETE CASCADE,
  kind text NOT NULL,
  pages integer[] NOT NULL DEFAULT '{}',
  record_key text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  response_id text,
  result jsonb,
  usage jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS drawing_quantity_tasks_run_idx
  ON public.drawing_quantity_tasks (run_id, state);

ALTER TABLE public.drawing_quantity_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_quantity_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drawing_quantity_runs_select ON public.drawing_quantity_runs;
CREATE POLICY drawing_quantity_runs_select
  ON public.drawing_quantity_runs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS drawing_quantity_tasks_select ON public.drawing_quantity_tasks;
CREATE POLICY drawing_quantity_tasks_select
  ON public.drawing_quantity_tasks FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.drawing_quantity_runs TO authenticated;
GRANT SELECT ON public.drawing_quantity_tasks TO authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_drawing_quantity_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.drawing_quantity_runs
    WHERE state IN ('pending', 'surveying', 'reading', 'zooming')
      AND start_after <= now()
  ) THEN
    RETURN;
  END IF;

  SELECT value INTO v_url
  FROM public.system_push_config
  WHERE key = 'functions_register_drawing_quality_url';

  SELECT value INTO v_secret
  FROM public.system_push_config
  WHERE key = 'drawing_quality_webhook_secret';

  IF coalesce(v_url, '') = '' OR coalesce(v_secret, '') = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-drawing-quality-secret', v_secret
    ),
    body := jsonb_build_object('action', 'tick'),
    timeout_milliseconds := 15000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_drawing_quantity_tick() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'drawing_quantity_tick';

SELECT cron.schedule(
  'drawing_quantity_tick',
  '* * * * *',
  $$SELECT public.dispatch_drawing_quantity_tick();$$
);

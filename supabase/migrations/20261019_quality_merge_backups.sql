CREATE TABLE IF NOT EXISTS public.quality_merge_backups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  keeper_id bigint NOT NULL,
  rows jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quality_merge_backups_keeper_idx
  ON public.quality_merge_backups (keeper_id, created_at DESC);

CREATE INDEX IF NOT EXISTS quality_merge_backups_created_idx
  ON public.quality_merge_backups (created_at);

ALTER TABLE public.quality_merge_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quality_merge_backups_select ON public.quality_merge_backups;
CREATE POLICY quality_merge_backups_select
  ON public.quality_merge_backups FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS quality_merge_backups_insert ON public.quality_merge_backups;
CREATE POLICY quality_merge_backups_insert
  ON public.quality_merge_backups FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS quality_merge_backups_delete ON public.quality_merge_backups;
CREATE POLICY quality_merge_backups_delete
  ON public.quality_merge_backups FOR DELETE TO authenticated
  USING (true);

REVOKE ALL ON public.quality_merge_backups FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.quality_merge_backups TO authenticated;

CREATE OR REPLACE FUNCTION public.undo_quality_merge(p_backup_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  SELECT rows INTO v_rows
  FROM public.quality_merge_backups
  WHERE id = p_backup_id
  FOR UPDATE;

  IF v_rows IS NULL THEN
    RAISE EXCEPTION 'merge_backup_missing';
  END IF;

  DELETE FROM public.quality_list
  WHERE id IN (SELECT (item->>'id')::bigint FROM jsonb_array_elements(v_rows) AS item);

  INSERT INTO public.quality_list
  SELECT * FROM jsonb_populate_recordset(NULL::public.quality_list, v_rows);

  DELETE FROM public.quality_merge_backups WHERE id = p_backup_id;
END;
$$;

REVOKE ALL ON FUNCTION public.undo_quality_merge(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_quality_merge(bigint) TO authenticated;

SELECT cron.unschedule('quality-merge-backups-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'quality-merge-backups-cleanup');

SELECT cron.schedule(
  'quality-merge-backups-cleanup',
  '0 18 * * *',
  $$DELETE FROM public.quality_merge_backups WHERE created_at < now() - interval '1 month'$$
);

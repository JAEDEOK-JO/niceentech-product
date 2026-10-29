CREATE TABLE IF NOT EXISTS public.maker_catalog (
  name text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maker_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maker_catalog_select ON public.maker_catalog;
CREATE POLICY maker_catalog_select
  ON public.maker_catalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS maker_catalog_insert ON public.maker_catalog;
CREATE POLICY maker_catalog_insert
  ON public.maker_catalog
  FOR INSERT
  TO authenticated
  WITH CHECK (char_length(btrim(name)) > 0);

GRANT SELECT, INSERT ON public.maker_catalog TO authenticated;

CREATE TABLE IF NOT EXISTS public.cnc_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  quantity integer NOT NULL CHECK (quantity >= 0),
  is_completed boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cnc_items_created_at
  ON public.cnc_items (created_at DESC);

ALTER TABLE public.cnc_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.cnc_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.cnc_items_id_seq TO authenticated;

CREATE POLICY cnc_items_select_authenticated
  ON public.cnc_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY cnc_items_insert_authenticated
  ON public.cnc_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY cnc_items_update_authenticated
  ON public.cnc_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

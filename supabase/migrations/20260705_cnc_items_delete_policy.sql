ALTER TABLE public.cnc_items ENABLE ROW LEVEL SECURITY;

GRANT DELETE ON public.cnc_items TO authenticated;

DROP POLICY IF EXISTS cnc_items_delete_manage ON public.cnc_items;

CREATE POLICY cnc_items_delete_manage
  ON public.cnc_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE(p.activate, true) = true
        AND (
          p.role::text IN ('admin', '관리자')
          OR COALESCE(p.department, '') ILIKE '%설계%'
        )
    )
  );

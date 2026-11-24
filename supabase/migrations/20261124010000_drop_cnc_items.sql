DROP FUNCTION IF EXISTS public.can_manage_cnc_items(uuid);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cnc_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.cnc_items;
  END IF;
END
$$;

DROP TABLE IF EXISTS public.cnc_items;

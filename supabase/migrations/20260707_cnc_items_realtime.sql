DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'cnc_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cnc_items;
  END IF;
END
$$;

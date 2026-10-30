DO $$
DECLARE
  rel record;
  blocked text[] := ARRAY[
    'chatbot_messages',
    'fcm_tokens',
    'device_tokens',
    'push_subscriptions',
    'system_push_config',
    'push_recipient_settings'
  ];
  employee_cols text;
BEGIN
  FOR rel IN
    SELECT c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    IF rel.name = ANY (blocked) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM chatbot_reader', rel.name);
      EXECUTE format('DROP POLICY IF EXISTS chatbot_reader_read ON public.%I', rel.name);
    ELSE
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO chatbot_reader', rel.name);
      EXECUTE format('DROP POLICY IF EXISTS chatbot_reader_read ON public.%I', rel.name);
      EXECUTE format(
        'CREATE POLICY chatbot_reader_read ON public.%I FOR SELECT TO chatbot_reader USING (true)',
        rel.name
      );
    END IF;
  END LOOP;

  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
  INTO employee_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name <> 'password';

  EXECUTE 'REVOKE SELECT ON TABLE public.employees FROM chatbot_reader';
  EXECUTE format('GRANT SELECT (%s) ON TABLE public.employees TO chatbot_reader', employee_cols);
END $$;

CREATE OR REPLACE FUNCTION public.chatbot_select(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '8s'
AS $$
DECLARE
  cleaned text;
  result jsonb;
  match text[];
  fn text;
  table_name text;
  schema_name text;
  found_table boolean := false;
  allowed_fn text[] := ARRAY[
    'count', 'sum', 'avg', 'min', 'max', 'coalesce', 'nullif',
    'btrim', 'trim', 'lower', 'upper', 'length', 'char_length',
    'substring', 'left', 'right', 'replace', 'strpos', 'split_part',
    'date_trunc', 'date_part', 'extract', 'timezone', 'to_char', 'to_date', 'to_timestamp',
    'cast', 'date', 'make_date', 'concat', 'concat_ws',
    'greatest', 'least', 'abs', 'round', 'ceil', 'floor',
    'string_agg', 'bool_or', 'bool_and', 'filter', 'over', 'now', 'row_number',
    'where', 'and', 'or', 'not', 'in', 'on', 'select', 'from', 'join', 'having',
    'when', 'then', 'else', 'case', 'exists', 'between', 'like', 'ilike', 'is',
    'as', 'at', 'time', 'zone', 'interval', 'similar'
  ];
BEGIN
  IF p_sql IS NULL THEN
    RAISE EXCEPTION 'empty_sql';
  END IF;

  cleaned := regexp_replace(btrim(p_sql), '/\*[^*]*\*+([^/*][^*]*\*+)*/', ' ', 'g');
  cleaned := regexp_replace(cleaned, '--[^\r\n]*', ' ', 'g');
  cleaned := btrim(cleaned);
  IF right(cleaned, 1) = ';' THEN
    cleaned := btrim(left(cleaned, length(cleaned) - 1));
  END IF;

  IF cleaned = '' OR char_length(cleaned) > 2000 THEN
    RAISE EXCEPTION 'unsafe_sql';
  END IF;
  IF cleaned ~ '[;]|--|/\*|\*/|\$' THEN
    RAISE EXCEPTION 'unsafe_sql';
  END IF;
  IF cleaned !~* '^\s*select\s' THEN
    RAISE EXCEPTION 'select_only';
  END IF;
  IF cleaned ~* '\mpassword\M'
     OR cleaned ~* '\m(insert|update|delete|drop|alter|grant|revoke|truncate|copy|create|comment|execute|call|do|set|reset|into|auth|storage|vault|information_schema|pg_catalog|realtime|dblink|current_setting|set_config)\M'
     OR cleaned ~* '\m(pg_|chatbot_)' THEN
    RAISE EXCEPTION 'unsafe_sql';
  END IF;

  FOR match IN
    SELECT re.match
    FROM regexp_matches(cleaned, '\m(from|join)\s+(public\.)?([a-z_][a-z0-9_]*)', 'gi') AS re(match)
  LOOP
    found_table := true;
    schema_name := match[2];
    table_name := lower(match[3]);
    IF schema_name IS NOT NULL AND schema_name <> '' AND schema_name <> 'public.' THEN
      RAISE EXCEPTION 'unknown_table';
    END IF;
    IF table_name = ANY (ARRAY[
      'chatbot_messages',
      'fcm_tokens',
      'device_tokens',
      'push_subscriptions',
      'system_push_config',
      'push_recipient_settings'
    ]) OR NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname = table_name
    ) THEN
      RAISE EXCEPTION 'unknown_table';
    END IF;
  END LOOP;

  IF NOT found_table THEN
    RAISE EXCEPTION 'no_table';
  END IF;

  FOR fn IN
    SELECT lower(re.match[1])
    FROM regexp_matches(cleaned, '\m([a-z_][a-z0-9_]*)\s*\(', 'gi') AS re(match)
  LOOP
    IF NOT (fn = ANY (allowed_fn)) THEN
      RAISE EXCEPTION 'unsafe_sql';
    END IF;
  END LOOP;

  EXECUTE
    'SELECT coalesce(jsonb_agg((to_jsonb(wrapped) - ''wrapped_ord'') ORDER BY wrapped_ord), ''[]''::jsonb) FROM ('
    || 'SELECT inner_src.*, row_number() OVER () AS wrapped_ord FROM ('
    || cleaned
    || ') AS inner_src LIMIT 40) AS wrapped'
  INTO result;

  RETURN coalesce(result, '[]'::jsonb);
END;
$$;

GRANT CREATE ON SCHEMA public TO chatbot_reader;
ALTER FUNCTION public.chatbot_select(text) OWNER TO chatbot_reader;
REVOKE CREATE ON SCHEMA public FROM chatbot_reader;

REVOKE ALL ON FUNCTION public.chatbot_select(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chatbot_select(text) TO service_role;

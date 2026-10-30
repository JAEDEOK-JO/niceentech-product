CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(btrim(content)) > 0 AND char_length(content) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chatbot_messages_user_created_idx
  ON public.chatbot_messages (user_id, created_at);

ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chatbot_messages_select ON public.chatbot_messages;
CREATE POLICY chatbot_messages_select
  ON public.chatbot_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.chatbot_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.chatbot_messages TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chatbot_reader') THEN
    CREATE ROLE chatbot_reader NOLOGIN NOINHERIT;
  END IF;
END $$;

GRANT chatbot_reader TO postgres;
GRANT chatbot_reader TO service_role;
GRANT chatbot_reader TO authenticator;
GRANT SELECT ON public.product_list, public.quality_list, public.maker_catalog TO chatbot_reader;

DROP POLICY IF EXISTS chatbot_reader_product_list ON public.product_list;
CREATE POLICY chatbot_reader_product_list
  ON public.product_list
  FOR SELECT
  TO chatbot_reader
  USING (true);

DROP POLICY IF EXISTS chatbot_reader_quality_list ON public.quality_list;
CREATE POLICY chatbot_reader_quality_list
  ON public.quality_list
  FOR SELECT
  TO chatbot_reader
  USING (true);

DROP POLICY IF EXISTS chatbot_reader_maker_catalog ON public.maker_catalog;
CREATE POLICY chatbot_reader_maker_catalog
  ON public.maker_catalog
  FOR SELECT
  TO chatbot_reader
  USING (true);

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
  IF cleaned ~* '\m(insert|update|delete|drop|alter|grant|revoke|truncate|copy|create|comment|execute|call|do|set|reset|into|auth|storage|vault|information_schema|pg_catalog|realtime|dblink|current_setting|set_config)\M'
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
    IF table_name NOT IN ('product_list', 'quality_list', 'maker_catalog') THEN
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

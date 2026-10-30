CREATE TABLE IF NOT EXISTS public.chatbot_notes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('value', 'learned')),
  topic text NOT NULL CHECK (char_length(btrim(topic)) > 0 AND char_length(topic) <= 120),
  note text NOT NULL CHECK (char_length(btrim(note)) > 0 AND char_length(note) <= 600),
  keywords text[] NOT NULL DEFAULT '{}',
  source_question text CHECK (source_question IS NULL OR char_length(source_question) <= 500),
  hit_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS chatbot_notes_value_topic_key
  ON public.chatbot_notes (topic)
  WHERE kind = 'value';

CREATE UNIQUE INDEX IF NOT EXISTS chatbot_notes_learned_key
  ON public.chatbot_notes (topic, note)
  WHERE kind = 'learned';

ALTER TABLE public.chatbot_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.chatbot_notes FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.chatbot_notes TO authenticated;

DROP POLICY IF EXISTS chatbot_notes_admin_select ON public.chatbot_notes;
CREATE POLICY chatbot_notes_admin_select
  ON public.chatbot_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS chatbot_notes_admin_delete ON public.chatbot_notes;
CREATE POLICY chatbot_notes_admin_delete
  ON public.chatbot_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

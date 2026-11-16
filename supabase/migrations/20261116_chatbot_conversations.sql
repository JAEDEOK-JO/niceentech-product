CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chatbot_conversations_user_updated_idx
  ON public.chatbot_conversations (user_id, updated_at DESC);

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chatbot_conversations_select ON public.chatbot_conversations;
CREATE POLICY chatbot_conversations_select
  ON public.chatbot_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS chatbot_conversations_delete ON public.chatbot_conversations;
CREATE POLICY chatbot_conversations_delete
  ON public.chatbot_conversations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.chatbot_conversations FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.chatbot_conversations TO authenticated;

ALTER TABLE public.chatbot_messages
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.chatbot_conversations (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS chatbot_messages_conversation_created_idx
  ON public.chatbot_messages (conversation_id, created_at);

INSERT INTO public.chatbot_conversations (user_id, title, created_at, updated_at)
SELECT
  m.user_id,
  coalesce((
    SELECT left(btrim(f.content), 120)
    FROM public.chatbot_messages f
    WHERE f.user_id = m.user_id AND f.role = 'user'
    ORDER BY f.created_at
    LIMIT 1
  ), ''),
  min(m.created_at),
  max(m.created_at)
FROM public.chatbot_messages m
WHERE m.conversation_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.chatbot_conversations c WHERE c.user_id = m.user_id)
GROUP BY m.user_id;

UPDATE public.chatbot_messages m
SET conversation_id = (
  SELECT c.id
  FROM public.chatbot_conversations c
  WHERE c.user_id = m.user_id
  ORDER BY c.updated_at DESC
  LIMIT 1
)
WHERE m.conversation_id IS NULL;

ALTER TABLE public.chatbot_messages
  ADD COLUMN IF NOT EXISTS reasoning text,
  ADD COLUMN IF NOT EXISTS duration_ms integer;

ALTER TABLE public.chatbot_messages
  DROP CONSTRAINT IF EXISTS chatbot_messages_reasoning_length;

ALTER TABLE public.chatbot_messages
  ADD CONSTRAINT chatbot_messages_reasoning_length
  CHECK (reasoning IS NULL OR char_length(reasoning) <= 8000);

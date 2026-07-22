-- 멘션 대상 + 채팅 FCM (방 멤버 알림)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS skip_push boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.notify_chat_message_fcm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
  v_room_title text;
  v_preview text;
  v_title text;
  v_body text;
  v_is_mention boolean;
BEGIN
  IF NEW.skip_push IS TRUE THEN
    RETURN NEW;
  END IF;

  IF coalesce(btrim(NEW.content), '') = '' AND coalesce(btrim(NEW.file_url), '') = '' THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(nullif(btrim(title), ''), '채팅')
    INTO v_room_title
  FROM public.chat_rooms
  WHERE id = NEW.room_id;

  IF coalesce(btrim(NEW.content), '') <> '' THEN
    v_preview := left(btrim(NEW.content), 80);
  ELSIF NEW.file_type = 'image' THEN
    v_preview := '사진을 보냈습니다';
  ELSIF NEW.file_type = 'video' THEN
    v_preview := '동영상을 보냈습니다';
  ELSIF NEW.file_type = 'pdf' THEN
    v_preview := 'PDF를 보냈습니다';
  ELSE
    v_preview := '파일을 보냈습니다';
  END IF;

  FOR v_recipient IN
    SELECT DISTINCT u.user_id
    FROM (
      SELECT m.user_id
      FROM public.chat_room_members m
      WHERE m.room_id = NEW.room_id
      UNION
      SELECT r.owner_id
      FROM public.chat_rooms r
      WHERE r.id = NEW.room_id
    ) u
    WHERE u.user_id IS NOT NULL
      AND u.user_id IS DISTINCT FROM NEW.sender_id
  LOOP
    v_is_mention := NEW.mentioned_user_ids IS NOT NULL
      AND v_recipient = ANY (NEW.mentioned_user_ids);

    IF v_is_mention THEN
      v_title := v_room_title;
      v_body := format('%s님이 회원님을 언급했습니다: %s', coalesce(nullif(btrim(NEW.sender_name), ''), '알 수 없음'), v_preview);
    ELSE
      v_title := v_room_title;
      v_body := format('%s: %s', coalesce(nullif(btrim(NEW.sender_name), ''), '알 수 없음'), v_preview);
    END IF;

    PERFORM public.dispatch_fcm_push(v_recipient, v_title, v_body, '/messenger');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_notify_fcm ON public.chat_messages;
CREATE TRIGGER chat_messages_notify_fcm
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message_fcm();

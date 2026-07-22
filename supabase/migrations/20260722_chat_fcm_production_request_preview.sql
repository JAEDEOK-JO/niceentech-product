-- 생산확인 요청 메시지 FCM 미리보기
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
  v_req_text text;
  v_req_initial text;
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

  IF NEW.file_type = 'production_request' THEN
    BEGIN
      v_req_initial := coalesce(nullif(btrim(NEW.content::jsonb ->> 'initial'), ''), '');
      v_req_text := coalesce(nullif(btrim(NEW.content::jsonb ->> 'requestText'), ''), '');
      v_preview := left(concat_ws(' · ', '생산확인 요청', nullif(v_req_initial, ''), nullif(v_req_text, '')), 80);
    EXCEPTION WHEN OTHERS THEN
      v_preview := '생산확인 요청';
    END;
  ELSIF coalesce(btrim(NEW.content), '') <> '' THEN
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

-- 같은 방 멤버는 서로의 last_read_at 조회 가능 (카톡식 읽음 숫자)
DROP POLICY IF EXISTS "Users can read own chat_room_reads" ON public.chat_room_reads;
DROP POLICY IF EXISTS chat_room_reads_select_members ON public.chat_room_reads;

CREATE POLICY chat_room_reads_select_members
  ON public.chat_room_reads
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.chat_room_members m
      WHERE m.room_id = chat_room_reads.room_id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.chat_rooms r
      WHERE r.id = chat_room_reads.room_id
        AND r.owner_id = (SELECT auth.uid())
    )
  );

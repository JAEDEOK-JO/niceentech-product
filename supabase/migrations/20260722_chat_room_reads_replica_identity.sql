-- realtime UPDATE 시 last_read_at 포함되도록
ALTER TABLE public.chat_room_reads REPLICA IDENTITY FULL;

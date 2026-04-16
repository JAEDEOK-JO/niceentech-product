ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS daepyo_by  text        DEFAULT NULL;
ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS daepyo_at  timestamptz DEFAULT NULL;

ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS gyeongyu_by  text        DEFAULT NULL;
ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS gyeongyu_at timestamptz DEFAULT NULL;

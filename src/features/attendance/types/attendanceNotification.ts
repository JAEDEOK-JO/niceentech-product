export interface AttendanceRequestNotification {
  id: number
  createdAt: string
  attendanceRequestId: number
  recipientUserId: string
  title: string
  message: string
  isRead: boolean
  readAt: string | null
}

const toNum = (v: unknown) => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

const toStr = (v: unknown) => String(v ?? '')

export function mapAttendanceRequestNotification(
  raw: Record<string, unknown>,
): AttendanceRequestNotification {
  return {
    id: toNum(raw.id),
    createdAt: toStr(raw.created_at),
    attendanceRequestId: toNum(raw.attendance_request_id),
    recipientUserId: toStr(raw.recipient_user_id),
    title: toStr(raw.title),
    message: toStr(raw.message),
    isRead: Boolean(raw.is_read),
    readAt: raw.read_at != null ? toStr(raw.read_at) : null,
  }
}

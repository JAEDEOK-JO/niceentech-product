export function formatAttendanceWorkflowDateTime(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '-'

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '-'

  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours())
  const min = String(date.getMinutes()).padStart(2, '0')

  return `${yy}년${mm}월${dd}일 ${hh}시${min}분`
}

export function formatWorkflowPendingDetail(
  reason: string | null | undefined,
  timestamp: string | null | undefined,
  timeLabel: string,
): string {
  const reasonText = String(reason ?? '').trim() || '-'
  return `사유 : ${reasonText} · ${timeLabel}: ${formatAttendanceWorkflowDateTime(timestamp)}`
}

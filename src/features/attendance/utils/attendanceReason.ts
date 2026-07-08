import { formatLeaveDaysCountLabel } from './attendanceLeaveType'

const formatDaysLabel = (daysCount: number, leaveType?: string) => {
  if (leaveType) {
    const label = formatLeaveDaysCountLabel(leaveType, daysCount)
    if (label) return label
  }

  const safe = Number(daysCount ?? 0)
  if (!Number.isFinite(safe) || safe <= 0) return ''
  return Number.isInteger(safe) ? `${safe}일` : `${safe.toFixed(1)}일`
}

const buildReasonBody = (reason: string) => {
  const normalized = String(reason ?? '').trim()
  if (normalized === '병원') return '병원 방문으로 인하여'
  if (normalized === '출입국방문') return '출입국 업무 방문으로 인하여'
  if (normalized === '은행업무') return '은행 업무로 인하여'
  if (normalized === '자동차수리') return '자동차 수리로 인하여'
  return normalized ? `${normalized}(으)로 인하여` : '개인 사유로'
}

export const formatAttendanceReasonText = ({
  leaveType,
  daysCount,
  reason,
}: {
  leaveType: string
  daysCount: number
  reason: string
}) => {
  const daysLabel = formatDaysLabel(daysCount, leaveType)
  const reasonBody = buildReasonBody(reason)
  const leaveLabel = String(leaveType ?? '').trim() || '휴가'

  return `${reasonBody} ${leaveLabel} ${daysLabel}을 요청드립니다.`.replace(/\s+/g, ' ').trim()
}

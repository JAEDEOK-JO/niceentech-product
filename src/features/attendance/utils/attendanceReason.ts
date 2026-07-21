import {
  formatLeaveDaysCountLabel,
  isHomeLeaveType,
} from './attendanceLeaveType'

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

/** 2026-01-01 → 26년 1월 1일 */
export function formatLeavePeriodKoreanDate(value: string): string {
  const matched = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!matched) return ''
  const [, year, month, day] = matched
  return `${year.slice(2)}년 ${Number(month)}월 ${Number(day)}일`
}

const formatHomeLeaveReasonText = (startDate: string, endDate: string) => {
  const start = formatLeavePeriodKoreanDate(startDate)
  const end = formatLeavePeriodKoreanDate(endDate || startDate)
  if (!start) return '본국 귀국 휴가 요청을 드립니다.'
  if (!end || start === end) {
    return `${start} 본국 귀국 휴가 요청을 드립니다.`
  }
  return `${start} 부터 ${end} 까지 본국 귀국 휴가 요청을 드립니다.`
}

export const formatAttendanceReasonText = ({
  leaveType,
  daysCount,
  reason,
  startDate,
  endDate,
}: {
  leaveType: string
  daysCount: number
  reason: string
  startDate?: string
  endDate?: string
}) => {
  if (isHomeLeaveType(leaveType)) {
    return formatHomeLeaveReasonText(startDate ?? '', endDate ?? '')
  }

  const daysLabel = formatDaysLabel(daysCount, leaveType)
  const reasonBody = buildReasonBody(reason)
  const leaveLabel = String(leaveType ?? '').trim() || '휴가'

  return `${reasonBody} ${leaveLabel} ${daysLabel}을 요청드립니다.`.replace(/\s+/g, ' ').trim()
}

import {
  formatLeaveDaysCountLabel,
  isHomeLeaveType,
} from './attendanceLeaveType'

/** 선택형 사유 — 신청서에 고정 문구가 붙는다 */
export const PRESET_LEAVE_REASONS = ['병원', '출입국방문', '은행업무', '자동차수리'] as const
export type PresetLeaveReason = (typeof PRESET_LEAVE_REASONS)[number]

export function isPresetLeaveReason(reason: string): reason is PresetLeaveReason {
  return (PRESET_LEAVE_REASONS as readonly string[]).includes(String(reason ?? '').trim())
}

const formatDaysLabel = (daysCount: number, leaveType?: string) => {
  if (leaveType) {
    const label = formatLeaveDaysCountLabel(leaveType, daysCount)
    if (label) return label
  }

  const safe = Number(daysCount ?? 0)
  if (!Number.isFinite(safe) || safe <= 0) return ''
  return Number.isInteger(safe) ? `${safe}일` : `${safe.toFixed(1)}일`
}

const buildPresetReasonBody = (reason: PresetLeaveReason) => {
  if (reason === '병원') return '병원 방문으로 인하여'
  if (reason === '출입국방문') return '출입국 업무 방문으로 인하여'
  if (reason === '은행업무') return '은행 업무로 인하여'
  return '자동차 수리로 인하여'
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

  const normalized = String(reason ?? '').trim()

  // 직접 입력: 신청서에 입력값 그대로 출력
  if (!isPresetLeaveReason(normalized)) {
    return normalized
  }

  const daysLabel = formatDaysLabel(daysCount, leaveType)
  const reasonBody = buildPresetReasonBody(normalized)
  const leaveLabel = String(leaveType ?? '').trim() || '휴가'

  return `${reasonBody} ${leaveLabel} ${daysLabel}을 요청드립니다.`.replace(/\s+/g, ' ').trim()
}

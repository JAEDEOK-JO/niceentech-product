import { ATTENDANCE_WORKFLOW_STATUS, getAttendanceStatusLabel } from './attendanceApprover'

export const ATTENDANCE_STATUS_CHANGE_OPTIONS = [
  ATTENDANCE_WORKFLOW_STATUS.PENDING,
  ATTENDANCE_WORKFLOW_STATUS.GYEONGYU_PENDING,
  ATTENDANCE_WORKFLOW_STATUS.FINAL_PENDING,
  ATTENDANCE_WORKFLOW_STATUS.REJECTED,
] as const

export type AttendanceStatusChangeValue = (typeof ATTENDANCE_STATUS_CHANGE_OPTIONS)[number]

export const attendanceStatusChangeOptions = ATTENDANCE_STATUS_CHANGE_OPTIONS.map((value) => ({
  value,
  label: getAttendanceStatusLabel(value),
}))

export const canChangeAttendanceStatus = (status: string) =>
  status === ATTENDANCE_WORKFLOW_STATUS.REJECTED

export function isAttendanceStatusChangeValue(value: string): value is AttendanceStatusChangeValue {
  return (ATTENDANCE_STATUS_CHANGE_OPTIONS as readonly string[]).includes(value)
}

export function buildAttendanceStatusUpdatePayload(status: AttendanceStatusChangeValue) {
  if (status === ATTENDANCE_WORKFLOW_STATUS.REJECTED) {
    return { status }
  }

  const payload: Record<string, string | null> = {
    status,
    reject_reason: null,
  }

  if (status === ATTENDANCE_WORKFLOW_STATUS.PENDING) {
    payload.approved_by = null
    payload.approved_at = null
    payload.gyeongyu_by = null
    payload.gyeongyu_at = null
    payload.daepyo_by = null
    payload.daepyo_at = null
  }

  if (status === ATTENDANCE_WORKFLOW_STATUS.GYEONGYU_PENDING) {
    payload.gyeongyu_by = null
    payload.gyeongyu_at = null
    payload.daepyo_by = null
    payload.daepyo_at = null
  }

  if (status === ATTENDANCE_WORKFLOW_STATUS.FINAL_PENDING) {
    payload.daepyo_by = null
    payload.daepyo_at = null
  }

  return payload
}

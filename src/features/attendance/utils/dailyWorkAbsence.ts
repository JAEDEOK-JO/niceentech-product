import type { AttendanceRequest, Employee } from '../types/attendance'
import { formatHomeLeaveLabel, isEmployeeOnHomeLeave } from './homeLeave'
import { isDeptHeadApproved } from './attendanceApprover'
import { LEAVE_TYPE_ABSENCE, LEAVE_TYPE_OUTING } from './attendanceLeaveType'

export interface DailyWorkAbsence {
  type: 'home-leave' | 'annual-leave' | 'half-day' | 'outing' | 'absence'
  label: string
}

const isWithinPeriod = (workDate: string, startDate: string, endDate: string) => {
  const target = String(workDate ?? '').slice(0, 10)
  const start = String(startDate ?? '').slice(0, 10)
  const end = String(endDate ?? '').slice(0, 10)
  if (!target || !start) return false
  if (target < start) return false
  return !end || target <= end
}

const isDepartmentApproved = (request: AttendanceRequest) => isDeptHeadApproved(request)

const formatLeaveLabel = (leaveType: string) => {
  if (leaveType === '연차') return '연차휴가'
  if (leaveType === '반차(오전)') return '반차(오전)'
  if (leaveType === '반차(오후)') return '반차(오후)'
  if (leaveType === LEAVE_TYPE_OUTING) return '외출(2시간)'
  if (leaveType === LEAVE_TYPE_ABSENCE) return '결근'
  return ''
}

const resolveAbsenceType = (leaveType: string): DailyWorkAbsence['type'] | null => {
  if (leaveType === '연차') return 'annual-leave'
  if (leaveType === LEAVE_TYPE_ABSENCE) return 'absence'
  if (leaveType === LEAVE_TYPE_OUTING) return 'outing'
  if (leaveType === '반차(오전)' || leaveType === '반차(오후)') return 'half-day'
  return null
}

export function getDailyWorkAbsence(
  employee: Employee,
  workDate: string,
  requests: AttendanceRequest[],
): DailyWorkAbsence | null {
  if (isEmployeeOnHomeLeave(employee, workDate)) {
    return { type: 'home-leave', label: formatHomeLeaveLabel(employee) }
  }

  const leave = requests.find((request) => {
    if (request.userName !== employee.name) return false
    if (!isDepartmentApproved(request)) return false
    if (!isWithinPeriod(workDate, request.startDate, request.endDate)) return false
    return Boolean(resolveAbsenceType(request.leaveType))
  })

  if (!leave) return null
  const label = formatLeaveLabel(leave.leaveType)
  const type = resolveAbsenceType(leave.leaveType)
  if (!label || !type) return null
  return { type, label }
}

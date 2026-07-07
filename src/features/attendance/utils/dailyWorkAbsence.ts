import type { AttendanceRequest, Employee } from '../types/attendance'
import { formatHomeLeaveLabel, isEmployeeOnHomeLeave } from './homeLeave'

export interface DailyWorkAbsence {
  type: 'home-leave' | 'annual-leave' | 'half-day'
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

import { isDeptHeadApproved } from './attendanceApprover'

const isDepartmentApproved = (request: AttendanceRequest) => isDeptHeadApproved(request)

const formatLeaveLabel = (leaveType: string) => {
  if (leaveType === '연차') return '연차휴가'
  if (leaveType === '반차(오전)') return '반차(오전)'
  if (leaveType === '반차(오후)') return '반차(오후)'
  return ''
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
    return request.leaveType === '연차' || request.leaveType === '반차(오전)' || request.leaveType === '반차(오후)'
  })

  if (!leave) return null
  const label = formatLeaveLabel(leave.leaveType)
  if (!label) return null
  return {
    type: leave.leaveType === '연차' ? 'annual-leave' : 'half-day',
    label,
  }
}

export const LEAVE_REASONS = ['병원', '출입국방문', '은행업무', '자동차수리'] as const
export { LEAVE_TYPES, type LeaveType } from '../utils/attendanceLeaveType'
export const LEAVE_STATUSES = ['대기중', '경유대기', '최종대기', '부서장승인', '승인', '반려'] as const

export type LeaveStatus = (typeof LEAVE_STATUSES)[number]

export interface AttendanceRequest {
  id: number
  userId: string
  userName: string
  department: string
  leaveType: LeaveType | string
  startDate: string
  endDate: string
  daysCount: number
  reason: string
  status: LeaveStatus | string
  approvedBy: string | null
  approvedAt: string | null
  rejectReason: string | null
  signatureUrl: string | null
  gyeongyuBy: string | null
  gyeongyuAt: string | null
  daepyoBy: string | null
  daepyoAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AttendanceAnnualQuota {
  id: number
  userId: string
  userName: string
  department: string
  year: number
  totalDays: number
  usedDays: number
  remainingDays: number
}

export interface AttendanceFilters {
  year: number
  month: number | null
  department: string
  status: LeaveStatus | ''
  searchQuery: string
}

export interface AttendanceFormState {
  id?: number
  selectedDepartment: string
  selectedEmployeeName: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  daysCount: number
  reason: string
}

const toStr = (v: unknown) => String(v ?? '')
const toNum = (v: unknown) => {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}
const normalizeApprovedBy = (value: unknown) => toStr(value).replace(/\(t\)/gi, '').trim()

export function mapAttendanceRequest(raw: Record<string, unknown>): AttendanceRequest {
  return {
    id: toNum(raw.id),
    userId: toStr(raw.user_id),
    userName: toStr(raw.user_name),
    department: toStr(raw.department),
    leaveType: toStr(raw.leave_type),
    startDate: toStr(raw.start_date),
    endDate: toStr(raw.end_date),
    daysCount: toNum(raw.days_count),
    reason: toStr(raw.reason),
    status: toStr(raw.status),
    approvedBy: raw.approved_by != null ? normalizeApprovedBy(raw.approved_by) : null,
    approvedAt: raw.approved_at != null ? toStr(raw.approved_at) : null,
    rejectReason: raw.reject_reason != null ? toStr(raw.reject_reason) : null,
    signatureUrl: raw.signature_url != null ? toStr(raw.signature_url) : null,
    gyeongyuBy: raw.gyeongyu_by != null ? toStr(raw.gyeongyu_by) : null,
    gyeongyuAt: raw.gyeongyu_at != null ? toStr(raw.gyeongyu_at) : null,
    daepyoBy: raw.daepyo_by != null ? toStr(raw.daepyo_by) : null,
    daepyoAt: raw.daepyo_at != null ? toStr(raw.daepyo_at) : null,
    createdAt: toStr(raw.created_at),
    updatedAt: toStr(raw.updated_at),
  }
}

export function mapAnnualQuota(raw: Record<string, unknown>): AttendanceAnnualQuota {
  const total = toNum(raw.total_days)
  const used = toNum(raw.used_days)
  return {
    id: toNum(raw.id),
    userId: toStr(raw.user_id),
    userName: toStr(raw.user_name),
    department: toStr(raw.department),
    year: toNum(raw.year),
    totalDays: total,
    usedDays: used,
    remainingDays: Math.max(0, total - used),
  }
}

export function createEmptyForm(): AttendanceFormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    selectedDepartment: '',
    selectedEmployeeName: '',
    leaveType: '연차',
    startDate: today,
    endDate: today,
    daysCount: 1,
    reason: '병원',
  }
}

// ─── 직원 ─────────────────────────────────────────────────────────────────────
export interface Employee {
  id: number
  employeeCode: string
  name: string
  department: string
  assignedDepartment: string
  remainingAnnualLeaveCount: number
  hourlyWage: number
  isFullTime: boolean
  nationality: string
  role: string
  hireDate: string | null
  homeLeaveStart: string | null
  homeLeaveEnd: string | null
  password: number
  createdAt: string
}

export function mapEmployee(raw: Record<string, unknown>): Employee {
  return {
    id: toNum(raw.id),
    employeeCode: raw.employee_code != null ? toStr(raw.employee_code) : '',
    name: toStr(raw.name),
    department: toStr(raw.department),
    assignedDepartment: toStr(raw.assigned_department),
    remainingAnnualLeaveCount: toNum(raw.remaining_annual_leave_count),
    hourlyWage: toNum(raw.hourly_wage),
    isFullTime: Boolean(raw.is_full_time),
    nationality: toStr(raw.nationality),
    role: toStr(raw.role),
    hireDate: raw.hire_date != null ? toStr(raw.hire_date) : null,
    homeLeaveStart: raw.home_leave_start != null ? toStr(raw.home_leave_start) : null,
    homeLeaveEnd: raw.home_leave_end != null ? toStr(raw.home_leave_end) : null,
    password: toNum(raw.password),
    createdAt: toStr(raw.created_at),
  }
}

// 대시보드 집계용
export interface AttendanceDashboardStats {
  employeeCount: number
  thisMonthTotal: number
  pendingCount: number
  approvedCount: number
  myRemainingDays: number
}

export interface AttendanceMonthlySummary {
  userId: string
  userName: string
  department: string
  annualCount: number
  halfDayCount: number
  sickCount: number
  otherCount: number
  totalApprovedCount: number
  totalUsedDays: number
}

// ─── 금일 작업시간 ─────────────────────────────────────────────────────────────
export const WORK_END_TIME_OPTIONS = [
  { value: '17:00', label: '5시' },
  { value: '20:30', label: '8시30분' },
  { value: '22:00', label: '10시' },
] as const

export type WorkEndTime = (typeof WORK_END_TIME_OPTIONS)[number]['value']

export interface DailyWorkHour {
  id: number
  workDate: string
  employeeId: number
  endTime: WorkEndTime | string
  createdAt: string
  updatedAt: string
}

export function mapDailyWorkHour(raw: Record<string, unknown>): DailyWorkHour {
  return {
    id: toNum(raw.id),
    workDate: toStr(raw.work_date).slice(0, 10),
    employeeId: toNum(raw.employee_id),
    endTime: toStr(raw.end_time),
    createdAt: toStr(raw.created_at),
    updatedAt: toStr(raw.updated_at),
  }
}

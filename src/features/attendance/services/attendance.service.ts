import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  mapAttendanceRequest,
  mapAnnualQuota,
  mapEmployee,
  mapDailyWorkHour,
  type AttendanceFilters,
  type AttendanceFormState,
  type AttendanceRequest,
  type AttendanceAnnualQuota,
  type AttendanceMonthlySummary,
  type DailyWorkHour,
  type Employee,
  type LeaveType,
} from '../types/attendance'

// 연차 차감 일수 계산 (연차/병가만 일수 차감)
const DEDUCTED_LEAVE_TYPES: string[] = ['연차', '반차(오전)', '반차(오후)', '병가']
const normalizeAttendanceApproverName = (value: string) => String(value ?? '').replace(/\(t\)/gi, '').trim()

// ─── 신청 목록 조회 ────────────────────────────────────────────────────────────
export async function fetchAttendanceRequests(
  filters: AttendanceFilters,
): Promise<AttendanceRequest[]> {
  let query = supabase
    .from('attendance_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.month) {
    const mm = String(filters.month).padStart(2, '0')
    const start = `${filters.year}-${mm}-01`
    const lastDay = new Date(filters.year, filters.month, 0).getDate()
    const endDate = `${filters.year}-${mm}-${String(lastDay).padStart(2, '0')}`
    query = query.lte('start_date', endDate).gte('end_date', start)
  } else if (filters.year) {
    const start = `${filters.year}-01-01`
    const end = `${filters.year}-12-31`
    query = query.lte('start_date', end).gte('end_date', start)
  }

  if (filters.department) {
    query = query.eq('department', filters.department)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.searchQuery.trim()) {
    query = query.ilike('user_name', `%${filters.searchQuery.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => mapAttendanceRequest(row as Record<string, unknown>))
}

// ─── 내 신청 목록 조회 ─────────────────────────────────────────────────────────
export async function fetchMyAttendanceRequests(userId: string): Promise<AttendanceRequest[]> {
  const { data, error } = await supabase
    .from('attendance_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapAttendanceRequest(row as Record<string, unknown>))
}

// ─── 신청 생성 ─────────────────────────────────────────────────────────────────
export async function createAttendanceRequest(
  form: AttendanceFormState,
  userId: string,
  userName: string,
  department: string,
  signatureBlob?: Blob,
): Promise<AttendanceRequest> {
  // 서명을 먼저 업로드해서 URL 확보 → INSERT에 바로 포함 (별도 UPDATE 불필요)
  let signatureUrl: string | null = null
  if (signatureBlob) {
    try {
      const timestamp = Date.now()
      const path = `requests/${userId}/${timestamp}.png`
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(path, signatureBlob, { upsert: false, contentType: 'image/png' })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(path)
      signatureUrl = urlData.publicUrl
    } catch (err) {
      console.error('[서명 업로드 실패]', err)
    }
  }

  const { data, error } = await supabase
    .from('attendance_requests')
    .insert({
      user_id: userId,
      user_name: userName,
      department,
      leave_type: form.leaveType,
      start_date: form.startDate,
      end_date: form.endDate,
      days_count: form.daysCount,
      reason: form.reason,
      status: '대기중',
      ...(signatureUrl ? { signature_url: signatureUrl } : {}),
    })
    .select()
    .single()

  if (error) throw error
  return mapAttendanceRequest(data as Record<string, unknown>)
}

// ─── 신청 수정 (본인, 대기중 상태만) ──────────────────────────────────────────
export async function updateAttendanceRequest(
  id: number,
  form: AttendanceFormState,
): Promise<void> {
  const { error } = await supabase
    .from('attendance_requests')
    .update({
      leave_type: form.leaveType,
      start_date: form.startDate,
      end_date: form.endDate,
      days_count: form.daysCount,
      reason: form.reason,
    })
    .eq('id', id)
    .eq('status', '대기중')

  if (error) throw error
}

// ─── 신청 취소/삭제 (본인, 대기중 상태만) ─────────────────────────────────────
export async function deleteAttendanceRequest(id: number): Promise<void> {
  const { error } = await supabase
    .from('attendance_requests')
    .delete()
    .eq('id', id)
    .eq('status', '대기중')

  if (error) throw error
}

// ─── 신청 삭제 (관리자, 상태 무관) ────────────────────────────────────────────
export async function adminDeleteAttendanceRequest(id: number): Promise<void> {
  const { error } = await supabase.from('attendance_requests').delete().eq('id', id)
  if (error) throw error
}

// ─── 신청 수정 (관리자, 상태 무관) ────────────────────────────────────────────
export async function adminUpdateAttendanceRequest(
  id: number,
  form: AttendanceFormState,
): Promise<void> {
  const { error } = await supabase
    .from('attendance_requests')
    .update({
      leave_type: form.leaveType,
      start_date: form.startDate,
      end_date: form.endDate,
      days_count: form.daysCount,
      reason: form.reason,
      user_name: form.selectedEmployeeName,
      department: form.selectedDepartment,
    })
    .eq('id', id)

  if (error) throw error
}

// ─── 경유 처리 ────────────────────────────────────────────────────────────────
export async function gyeongyuAttendanceRequest(
  id: number,
  byName: string,
): Promise<void> {
  const { error } = await supabase
    .from('attendance_requests')
    .update({
      gyeongyu_by: byName,
      gyeongyu_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

// ─── 부서장 승인 (1차) ────────────────────────────────────────────────────────
export async function approveAttendanceRequest(
  id: number,
  approverName: string,
): Promise<void> {
  const { error } = await supabase
    .from('attendance_requests')
    .update({
      status: '부서장승인',
      approved_by: normalizeAttendanceApproverName(approverName),
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

// ─── 대표 최종 승인 (2차) ──────────────────────────────────────────────────────
export async function daepyoApproveAttendanceRequest(
  id: number,
  byName: string,
): Promise<void> {
  const { data: req, error: fetchErr } = await supabase
    .from('attendance_requests')
    .select('user_id, leave_type, days_count, start_date')
    .eq('id', id)
    .single()

  if (fetchErr) throw fetchErr

  const { error } = await supabase
    .from('attendance_requests')
    .update({
      status: '승인',
      daepyo_by: normalizeAttendanceApproverName(byName),
      daepyo_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error

  // 연차 차감은 최종 승인 시점에 처리
  if (DEDUCTED_LEAVE_TYPES.includes(req.leave_type)) {
    const year = new Date(req.start_date).getFullYear()
    await upsertUsedDays(req.user_id as string, year, Number(req.days_count))
  }
}

export async function rejectAttendanceRequest(
  id: number,
  approverName: string,
  rejectReason: string,
): Promise<void> {
  const { error } = await supabase
    .from('attendance_requests')
    .update({
      status: '반려',
      approved_by: normalizeAttendanceApproverName(approverName),
      approved_at: new Date().toISOString(),
      reject_reason: rejectReason,
    })
    .eq('id', id)

  if (error) throw error
}

// ─── 연차 잔여 조회 ────────────────────────────────────────────────────────────
export async function fetchAnnualQuota(
  userId: string,
  year: number,
): Promise<AttendanceAnnualQuota | null> {
  const { data, error } = await supabase
    .from('attendance_annual_quota')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapAnnualQuota(data as Record<string, unknown>)
}

// 사용일수 누적
async function upsertUsedDays(userId: string, year: number, days: number): Promise<void> {
  const existing = await fetchAnnualQuota(userId, year)

  if (existing) {
    const { error } = await supabase
      .from('attendance_annual_quota')
      .update({ used_days: existing.usedDays + days })
      .eq('id', existing.id)
    if (error) throw error
  }
}

// ─── 실시간 구독 ────────────────────────────────────────────────────────────────
export function subscribeAttendanceRequests(callback: () => void): RealtimeChannel {
  return supabase
    .channel('attendance_requests_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance_requests' },
      callback,
    )
    .subscribe()
}

export function unsubscribeAttendance(channel: RealtimeChannel): void {
  void supabase.removeChannel(channel)
}

// ─── 부서 목록 (profiles 테이블에서 추출) ─────────────────────────────────────
export async function fetchDepartments(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('department')
    .not('department', 'is', null)
    .neq('department', '')

  if (error) throw error
  const depts = [...new Set((data ?? []).map((r: Record<string, unknown>) => String(r.department)))]
  return depts.filter(Boolean).sort()
}

// ─── 연차 현황 전체 목록 (관리자용) ───────────────────────────────────────────
export async function fetchAllAnnualQuotas(year: number): Promise<AttendanceAnnualQuota[]> {
  const { data, error } = await supabase
    .from('attendance_annual_quota')
    .select('*')
    .eq('year', year)
    .order('department')

  if (error) throw error
  return (data ?? []).map((row) => mapAnnualQuota(row as Record<string, unknown>))
}

export async function fetchAttendanceMonthlySummary(
  year: number,
  month: number,
): Promise<AttendanceMonthlySummary[]> {
  const safeMonth = Math.min(12, Math.max(1, Number(month) || 1))
  const monthText = String(safeMonth).padStart(2, '0')
  const startDate = `${year}-${monthText}-01`
  const endDate = `${year}-${monthText}-${String(new Date(year, safeMonth, 0).getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('attendance_requests')
    .select('user_id,user_name,department,leave_type,days_count,status,start_date')
    .eq('status', '승인')
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .order('user_name')

  if (error) throw error

  const summaryMap = new Map<string, AttendanceMonthlySummary>()
  for (const row of data ?? []) {
    const userId = String(row.user_id ?? '')
    const userName = String(row.user_name ?? '').trim()
    const department = String(row.department ?? '').trim()
    const leaveType = String(row.leave_type ?? '').trim()
    const daysCount = Number(row.days_count ?? 0) || 0
    const key = `${userName}:${department}`

    const current =
      summaryMap.get(key) ??
      {
        userId,
        userName,
        department,
        annualCount: 0,
        halfDayCount: 0,
        sickCount: 0,
        otherCount: 0,
        totalApprovedCount: 0,
        totalUsedDays: 0,
      }

    current.totalApprovedCount += 1
    current.totalUsedDays += daysCount

    if (leaveType === '연차') {
      current.annualCount += 1
    } else if (leaveType.startsWith('반차')) {
      current.halfDayCount += 1
    } else if (leaveType === '병가') {
      current.sickCount += 1
    } else {
      current.otherCount += 1
    }

    summaryMap.set(key, current)
  }

  return [...summaryMap.values()].sort((left, right) => {
    if (right.totalUsedDays !== left.totalUsedDays) return right.totalUsedDays - left.totalUsedDays
    if (right.totalApprovedCount !== left.totalApprovedCount) return right.totalApprovedCount - left.totalApprovedCount
    return left.userName.localeCompare(right.userName, 'ko')
  })
}

export async function fetchApprovedAttendanceRequestsByMonth(
  year: number,
  month: number,
): Promise<AttendanceRequest[]> {
  const safeMonth = Math.min(12, Math.max(1, Number(month) || 1))
  const monthText = String(safeMonth).padStart(2, '0')
  const startDate = `${year}-${monthText}-01`
  const endDate = `${year}-${monthText}-${String(new Date(year, safeMonth, 0).getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('attendance_requests')
    .select('*')
    .eq('status', '승인')
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => mapAttendanceRequest(row as Record<string, unknown>))
}

// ─── 직원 목록 ─────────────────────────────────────────────────────────────────
export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('department')
    .order('name')

  if (error) throw error
  return (data ?? []).map((row) => mapEmployee(row as Record<string, unknown>))
}

export async function fetchEmployeeCount(): Promise<number> {
  const { count, error } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  return count ?? 0
}

export interface EmployeeFormData {
  employeeCode: string
  name: string
  department: string
  assignedDepartment: string
  remainingAnnualLeaveCount: number
  hourlyWage: number
  isFullTime: boolean
  nationality: string
  role: string
  hireDate: string
  homeLeaveStart: string
  homeLeaveEnd: string
  password: number
}

export async function createEmployee(data: EmployeeFormData): Promise<Employee> {
  const { data: row, error } = await supabase
    .from('employees')
    .insert({
      employee_code: data.employeeCode || null,
      name: data.name,
      department: data.department,
      assigned_department: data.assignedDepartment,
      remaining_annual_leave_count: data.remainingAnnualLeaveCount,
      hourly_wage: data.hourlyWage,
      is_full_time: data.isFullTime,
      nationality: data.nationality,
      role: data.role,
      hire_date: data.hireDate || null,
      home_leave_start: data.homeLeaveStart || null,
      home_leave_end: data.homeLeaveEnd || null,
      password: data.password,
    })
    .select()
    .single()

  if (error) throw error
  return mapEmployee(row as Record<string, unknown>)
}

export async function assignEmployeeCodesBulk(
  mappings: Array<{ id: number; employeeCode: string; name?: string }>,
): Promise<void> {
  for (const m of mappings) {
    const patch: Record<string, unknown> = { employee_code: m.employeeCode }
    if (m.name && m.name.trim()) patch.name = m.name.trim()
    const { error } = await supabase.from('employees').update(patch).eq('id', m.id)
    if (error) throw error
  }
}

export async function updateEmployee(id: number, data: EmployeeFormData): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({
      employee_code: data.employeeCode || null,
      name: data.name,
      department: data.department,
      assigned_department: data.assignedDepartment,
      remaining_annual_leave_count: data.remainingAnnualLeaveCount,
      hourly_wage: data.hourlyWage,
      is_full_time: data.isFullTime,
      nationality: data.nationality,
      role: data.role,
      hire_date: data.hireDate || null,
      home_leave_start: data.homeLeaveStart || null,
      home_leave_end: data.homeLeaveEnd || null,
      password: data.password,
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteEmployee(id: number): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
}

// ─── 금일 작업시간 ─────────────────────────────────────────────────────────────
export async function fetchDailyWorkHours(workDate: string): Promise<DailyWorkHour[]> {
  const { data, error } = await supabase
    .from('daily_work_hours')
    .select('*')
    .eq('work_date', workDate)

  if (error) throw error
  return (data ?? []).map((r) => mapDailyWorkHour(r as Record<string, unknown>))
}

export async function fetchDailyWorkHoursRange(startDate: string, endDate: string): Promise<DailyWorkHour[]> {
  const { data, error } = await supabase
    .from('daily_work_hours')
    .select('*')
    .gte('work_date', startDate)
    .lte('work_date', endDate)

  if (error) throw error
  return (data ?? []).map((r) => mapDailyWorkHour(r as Record<string, unknown>))
}

export async function upsertDailyWorkHoursBulk(
  records: { workDate: string; employeeId: number; endTime: string }[],
): Promise<void> {
  if (records.length === 0) return
  const rows = records.map((r) => ({
    work_date: r.workDate,
    employee_id: r.employeeId,
    end_time: r.endTime,
  }))
  const { error } = await supabase
    .from('daily_work_hours')
    .upsert(rows, { onConflict: 'work_date,employee_id' })
  if (error) throw error
}

export async function deleteDailyWorkHour(workDate: string, employeeId: number): Promise<void> {
  const { error } = await supabase
    .from('daily_work_hours')
    .delete()
    .eq('work_date', workDate)
    .eq('employee_id', employeeId)
  if (error) throw error
}

// ─── 프로필 목록 (서명 관리용) ────────────────────────────────────────────────
export interface ProfileItem {
  id: string
  name: string
  signaturePath: string | null
}

export async function fetchProfilesList(): Promise<ProfileItem[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, signature_path')
    .order('name')

  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    signaturePath: r.signature_path ? String(r.signature_path) : null,
  }))
}

// ─── 서명 이미지 업로드 + profiles 저장 ───────────────────────────────────────
export async function uploadAndSaveSignature(userId: string, file: Blob): Promise<string> {
  const fileName = `${userId}/signature`

  const { error: uploadError } = await supabase.storage
    .from('signatures')
    .upload(fileName, file, { upsert: true, contentType: file.type || 'image/png' })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName)
  const publicUrl = urlData.publicUrl

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ signature_path: publicUrl })
    .eq('id', userId)

  if (updateError) throw updateError
  return publicUrl
}

// ─── 서명 이미지 조회 ──────────────────────────────────────────────────────────
export interface SignatureInfo {
  name: string
  signaturePath: string | null
}

export async function fetchSignatures(names: string[]): Promise<SignatureInfo[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, email, signature_path')

  if (error) throw error
  return names.map((name) => {
    const row = (data ?? []).find((r: Record<string, unknown>) => r.name === name || r.email === name)
    return { name, signaturePath: row?.signature_path ? String(row.signature_path) : null }
  })
}

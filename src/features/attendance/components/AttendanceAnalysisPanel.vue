<script setup lang="ts">
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { useDialog } from '@/composables/useDialog'
import type { Employee } from '../types/attendance'

const { alert, confirm } = useDialog()

const props = defineProps<{
  employees: Employee[]
}>()

interface ParsedRow {
  employeeCode: string
  rawName: string
  workDate: string
  clockIn: string | null
  clockOut: string | null
  adjustedClockIn: string | null
  adjustedClockOut: string | null
  workSeconds: number
  normalSeconds: number
  overtimeSeconds: number
  tardySeconds: number
  department: string
  matched: boolean
  employeeName: string
  hourlyWage: number
  normalPay: number
  overtimePay: number
  totalPay: number
  missingClock: boolean
}

interface WeeklyGroup {
  employeeCode: string
  weekStart: string
  totalSeconds: number
  over52Seconds: number
}

interface LeaveCreditSummary {
  employeeCode: string
  employeeName: string
  department: string
  hourlyWage: number
  leaveDays: number
  normalSeconds: number
  workedDays: number
  normalPay: number
}

interface EmployeeSummary {
  employeeCode: string
  employeeName: string
  department: string
  matched: boolean
  hourlyWage: number
  leaveDays: number
  totalSeconds: number
  normalSeconds: number
  overtimeSeconds: number
  over52Seconds: number
  tardyCount: number
  tardySeconds: number
  missingClockDays: number
  workedDays: number
  normalPay: number
  overtimePay: number
  totalPay: number
}

const DAY_START_SECONDS = 8 * 3600
const DAY_END_SECONDS = 17 * 3600
const LUNCH_START_SECONDS = 12 * 3600
const LUNCH_END_SECONDS = 13 * 3600
const DINNER_START_SECONDS = 19 * 3600
const DINNER_END_SECONDS = 19 * 3600 + 30 * 60
const CLOCK_IN_GRACE_START_SECONDS = 7 * 3600
const CLOCK_IN_GRACE_END_SECONDS = 8 * 3600 + 20 * 60
const CLOCK_OUT_GRACE_START_SECONDS = 16 * 3600 + 30 * 60
const CLOCK_OUT_GRACE_END_SECONDS = 17 * 3600 + 20 * 60
const DAY_END_CAP_SECONDS = 24 * 3600
const WEEK_LIMIT_SECONDS = 52 * 3600

const parsedRows = ref<ParsedRow[]>([])
const leaveCredits = ref<LeaveCreditSummary[]>([])
const uploadedFileName = ref('')
const uploading = ref(false)
const saving = ref(false)
const savedMessage = ref('')

const employeeMap = computed(() => {
  const map = new Map<string, Employee>()
  for (const emp of props.employees) {
    if (emp.employeeCode) map.set(emp.employeeCode, emp)
  }
  return map
})

const normalizeEmployeeName = (value: string): string =>
  String(value ?? '')
    .replace(/\s+/g, '')
    .trim()

const employeeNameMap = computed(() => {
  const map = new Map<string, Employee[]>()
  for (const emp of props.employees) {
    const key = normalizeEmployeeName(emp.name)
    if (!key) continue
    const current = map.get(key) ?? []
    current.push(emp)
    map.set(key, current)
  }
  return map
})

const normalizeIdCell = (value: unknown): string => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const matched = raw.match(/(\d{1,8})/)
  if (!matched) return ''
  return matched[1].padStart(8, '0')
}

const excelSerialToDate = (serial: number): Date => {
  const utcMs = Math.round((serial - 25569) * 86400 * 1000)
  return new Date(utcMs)
}

const normalizeDateCell = (value: unknown): string => {
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const date = excelSerialToDate(value)
    return normalizeDateCell(date)
  }
  const raw = String(value ?? '').trim()
  const iso = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  }
  const slash = raw.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (slash) {
    return `${slash[1]}-${slash[2].padStart(2, '0')}-${slash[3].padStart(2, '0')}`
  }
  const dot = raw.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)
  if (dot) {
    return `${dot[1]}-${dot[2].padStart(2, '0')}-${dot[3].padStart(2, '0')}`
  }
  return ''
}

const parseTimeCell = (value: unknown): { str: string | null; seconds: number | null } => {
  if (value == null) return { str: null, seconds: null }
  if (typeof value === 'number' && value > 0 && value < 1) {
    const totalSeconds = Math.round(value * 86400)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return { str, seconds: totalSeconds }
  }
  const raw = String(value).trim()
  if (!raw || raw === '--' || raw === '-') return { str: null, seconds: null }
  const matched = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!matched) return { str: null, seconds: null }
  const h = Number(matched[1])
  const m = Number(matched[2])
  const s = Number(matched[3] ?? 0)
  const totalSeconds = h * 3600 + m * 60 + s
  const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return { str, seconds: totalSeconds }
}

// 지각: 양수값(지각 분) 만 반환. 음수(조기출근)/--/빈값은 0.
const parseTardyCell = (value: unknown): number => {
  if (value == null) return 0
  if (typeof value === 'number') {
    if (value >= 0 && value < 1) {
      return Math.round(value * 86400)
    }
    return value > 0 ? Math.round(value) : 0
  }
  const raw = String(value).trim()
  if (!raw || raw === '--' || raw === '-') return 0
  if (raw.includes('-')) return 0
  const matched = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!matched) return 0
  const h = Number(matched[1])
  const m = Number(matched[2])
  const s = Number(matched[3] ?? 0)
  return h * 3600 + m * 60 + s
}

const formatTimeValue = (seconds: number | null): string | null => {
  if (seconds == null) return null
  const normalized = ((seconds % DAY_END_CAP_SECONDS) + DAY_END_CAP_SECONDS) % DAY_END_CAP_SECONDS
  const h = Math.floor(normalized / 3600)
  const m = Math.floor((normalized % 3600) / 60)
  const s = normalized % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const overlapSeconds = (start: number, end: number, rangeStart: number, rangeEnd: number): number =>
  Math.max(0, Math.min(end, rangeEnd) - Math.max(start, rangeStart))

const adjustClockInForPayroll = (seconds: number): number => {
  if (seconds >= CLOCK_IN_GRACE_START_SECONDS && seconds <= CLOCK_IN_GRACE_END_SECONDS) {
    return DAY_START_SECONDS
  }
  return seconds
}

const adjustClockOutForPayroll = (seconds: number): number => {
  if (seconds >= CLOCK_OUT_GRACE_START_SECONDS && seconds <= CLOCK_OUT_GRACE_END_SECONDS) {
    return DAY_END_SECONDS
  }
  return seconds
}

const roundCurrency = (amount: number): number => Math.round(amount)

const calculatePayrollBreakdown = (
  clockInSeconds: number | null,
  clockOutSeconds: number | null,
  hourlyWage: number,
) => {
  if (clockInSeconds == null || clockOutSeconds == null) {
    return {
      adjustedClockIn: null,
      adjustedClockOut: null,
      totalPaidSeconds: 0,
      normalSeconds: 0,
      overtimeSeconds: 0,
      normalPay: 0,
      overtimePay: 0,
      totalPay: 0,
    }
  }

  const adjustedClockIn = adjustClockInForPayroll(clockInSeconds)
  const adjustedClockOut = adjustClockOutForPayroll(clockOutSeconds)

  if (adjustedClockOut <= adjustedClockIn) {
    return {
      adjustedClockIn: formatTimeValue(adjustedClockIn),
      adjustedClockOut: formatTimeValue(adjustedClockOut),
      totalPaidSeconds: 0,
      normalSeconds: 0,
      overtimeSeconds: 0,
      normalPay: 0,
      overtimePay: 0,
      totalPay: 0,
    }
  }

  const normalWindowSeconds = overlapSeconds(
    adjustedClockIn,
    adjustedClockOut,
    DAY_START_SECONDS,
    DAY_END_SECONDS,
  )
  const lunchSeconds = overlapSeconds(
    adjustedClockIn,
    adjustedClockOut,
    LUNCH_START_SECONDS,
    LUNCH_END_SECONDS,
  )
  const normalSeconds = Math.max(0, normalWindowSeconds - lunchSeconds)
  const overtimeWindowSeconds =
    overlapSeconds(adjustedClockIn, adjustedClockOut, 0, DAY_START_SECONDS) +
    overlapSeconds(adjustedClockIn, adjustedClockOut, DAY_END_SECONDS, DAY_END_CAP_SECONDS)
  const dinnerSeconds = overlapSeconds(
    adjustedClockIn,
    adjustedClockOut,
    DINNER_START_SECONDS,
    DINNER_END_SECONDS,
  )
  const overtimeSeconds = Math.max(0, overtimeWindowSeconds - dinnerSeconds)

  const normalPay = roundCurrency((normalSeconds / 3600) * hourlyWage)
  const overtimePay = roundCurrency((overtimeSeconds / 3600) * hourlyWage * 1.5)

  return {
    adjustedClockIn: formatTimeValue(adjustedClockIn),
    adjustedClockOut: formatTimeValue(adjustedClockOut),
    totalPaidSeconds: normalSeconds + overtimeSeconds,
    normalSeconds,
    overtimeSeconds,
    normalPay,
    overtimePay,
    totalPay: normalPay + overtimePay,
  }
}

// 헤더 이름 매칭 (공백/대소문자 무시, 부분일치)
const HEADER_PATTERNS = {
  id: [/\bid\b/i, /사번/, /번호/],
  name: [/이름/, /성명/, /^name$/i],
  date: [/날짜/, /일자/, /date/i],
  clockIn: [/출근/, /clock\s*in/i, /출근시간/],
  clockOut: [/퇴근/, /clock\s*out/i, /퇴근시간/],
  workHours: [/근무시간/, /근로시간/, /work/i, /근무/],
  tardy: [/지각/, /tardy/i, /late/i],
  department: [/부서/, /department/i, /팀/],
} as const

type HeaderKey = keyof typeof HEADER_PATTERNS

const findColumn = (headers: string[], key: HeaderKey): number => {
  const patterns = HEADER_PATTERNS[key]
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] ?? '').trim()
    if (!h) continue
    for (const pat of patterns) {
      if (pat.test(h)) return i
    }
  }
  return -1
}

const detectHeaderRow = (aoa: unknown[][]): number => {
  for (let i = 0; i < Math.min(aoa.length, 20); i++) {
    const row = aoa[i]
    if (!row) continue
    const joined = row.map((c) => String(c ?? '')).join('|').toLowerCase()
    let hits = 0
    if (/id|사번/.test(joined)) hits++
    if (/이름|성명|name/.test(joined)) hits++
    if (/날짜|일자|date/.test(joined)) hits++
    if (/출근|clock/.test(joined)) hits++
    if (hits >= 3) return i
  }
  return 0
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  uploadedFileName.value = file.name
  savedMessage.value = ''
  leaveCredits.value = []

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false })

    if (aoa.length === 0) {
      await alert('엑셀 파일이 비어있습니다.')
      return
    }

    const headerRowIdx = detectHeaderRow(aoa)
    const headers = (aoa[headerRowIdx] ?? []).map((c) => String(c ?? '').trim())

    const col = {
      id: findColumn(headers, 'id'),
      name: findColumn(headers, 'name'),
      date: findColumn(headers, 'date'),
      clockIn: findColumn(headers, 'clockIn'),
      clockOut: findColumn(headers, 'clockOut'),
      workHours: findColumn(headers, 'workHours'),
      tardy: findColumn(headers, 'tardy'),
      department: findColumn(headers, 'department'),
    }

    if (col.id < 0 || col.date < 0) {
      await alert(
        `엑셀 헤더를 인식하지 못했습니다.\n필수 컬럼: ID, 날짜\n\n감지된 헤더: ${headers.join(', ')}`,
      )
      return
    }

    const nextRows: ParsedRow[] = []
    for (let i = headerRowIdx + 1; i < aoa.length; i++) {
      const row = aoa[i]
      if (!row || row.length === 0) continue

      const idCell = col.id >= 0 ? row[col.id] : ''
      const nameCell = col.name >= 0 ? row[col.name] : ''
      const dateCell = col.date >= 0 ? row[col.date] : ''

      const employeeCode = normalizeIdCell(idCell)
      const workDate = normalizeDateCell(dateCell)
      if (!employeeCode || !workDate) continue

      const clockIn = parseTimeCell(col.clockIn >= 0 ? row[col.clockIn] : null)
      const clockOut = parseTimeCell(col.clockOut >= 0 ? row[col.clockOut] : null)
      const tardySeconds = parseTardyCell(col.tardy >= 0 ? row[col.tardy] : null)
      const matchedEmployee = employeeMap.value.get(employeeCode)
      const payroll = calculatePayrollBreakdown(
        clockIn.seconds,
        clockOut.seconds,
        matchedEmployee?.hourlyWage ?? 0,
      )
      const department = matchedEmployee?.department ?? String(col.department >= 0 ? row[col.department] ?? '' : '').trim()
      const missingClock = clockIn.seconds == null || clockOut.seconds == null

      nextRows.push({
        employeeCode,
        rawName: String(nameCell ?? '').trim(),
        workDate,
        clockIn: clockIn.str,
        clockOut: clockOut.str,
        adjustedClockIn: payroll.adjustedClockIn,
        adjustedClockOut: payroll.adjustedClockOut,
        workSeconds: payroll.totalPaidSeconds,
        normalSeconds: payroll.normalSeconds,
        overtimeSeconds: payroll.overtimeSeconds,
        tardySeconds,
        department,
        matched: Boolean(matchedEmployee),
        employeeName: matchedEmployee?.name ?? String(nameCell ?? '').trim(),
        hourlyWage: matchedEmployee?.hourlyWage ?? 0,
        normalPay: payroll.normalPay,
        overtimePay: payroll.overtimePay,
        totalPay: payroll.totalPay,
        missingClock,
      })
    }

    parsedRows.value = nextRows
    if (nextRows.length > 0) {
      const sortedDates = [...new Set(nextRows.map((row) => row.workDate))].sort()
      const parsedDateKeys = new Set(nextRows.map((row) => `${row.employeeCode}:${row.workDate}`))
      try {
        leaveCredits.value = await fetchLeaveCredits(
          sortedDates[0],
          sortedDates[sortedDates.length - 1],
          parsedDateKeys,
        )
      } catch (leaveError) {
        console.error(leaveError)
        leaveCredits.value = []
        await alert(`연차/반차 반영에 실패했습니다: ${(leaveError as Error).message}`)
      }
    }
    if (nextRows.length === 0) {
      await alert(
        `유효한 근태 데이터를 찾지 못했습니다.\n\n감지된 헤더: ${headers.join(', ')}\n총 ${aoa.length}행에서 ID/날짜가 추출된 행이 없습니다.`,
      )
    }
  } catch (err) {
    console.error(err)
    await alert(`엑셀 파싱에 실패했습니다: ${(err as Error).message}`)
  } finally {
    uploading.value = false
    target.value = ''
  }
}

const getIsoWeekStart = (dateStr: string): string => {
  const date = new Date(`${dateStr}T00:00:00`)
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + mondayOffset)
  date.setHours(0, 0, 0, 0)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const weeklyGroups = computed<WeeklyGroup[]>(() => {
  const groupMap = new Map<string, WeeklyGroup>()

  for (const row of parsedRows.value) {
    const weekStart = getIsoWeekStart(row.workDate)
    const key = `${row.employeeCode}:${weekStart}`
    const current =
      groupMap.get(key) ??
      {
        employeeCode: row.employeeCode,
        weekStart,
        totalSeconds: 0,
        over52Seconds: 0,
      }

    current.totalSeconds += row.workSeconds
    groupMap.set(key, current)
  }

  for (const group of groupMap.values()) {
    group.over52Seconds = Math.max(0, group.totalSeconds - WEEK_LIMIT_SECONDS)
  }

  return [...groupMap.values()]
})

const resolveEmployeeByLeaveRequest = (userName: string, department: string): Employee | null => {
  const candidates = employeeNameMap.value.get(normalizeEmployeeName(userName)) ?? []
  if (!candidates.length) return null
  return (
    candidates.find(
      (emp) => emp.department === department || emp.assignedDepartment === department,
    ) ?? candidates[0]
  )
}

const formatIsoDate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const enumerateInclusiveDates = (startDate: string, endDate: string): string[] => {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return []
  }

  const dates: string[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(formatIsoDate(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

const isHalfDayLeaveType = (leaveType: string): boolean => leaveType.startsWith('반차')

const fetchLeaveCredits = async (
  startDate: string,
  endDate: string,
  parsedDateKeys: Set<string>,
): Promise<LeaveCreditSummary[]> => {
  const { data, error } = await supabase
    .from('attendance_requests')
    .select('user_name, department, leave_type, start_date, end_date, days_count, status')
    .eq('status', '승인')
    .lte('start_date', endDate)
    .gte('end_date', startDate)

  if (error) throw error

  const creditMap = new Map<string, LeaveCreditSummary>()

  for (const row of data ?? []) {
    const leaveType = String(row.leave_type ?? '').trim()
    const employee = resolveEmployeeByLeaveRequest(
      String(row.user_name ?? ''),
      String(row.department ?? ''),
    )

    if (!employee || !employee.employeeCode) continue

    const key = employee.employeeCode
    const current =
      creditMap.get(key) ??
      {
        employeeCode: employee.employeeCode,
        employeeName: employee.name,
        department: employee.department,
        hourlyWage: employee.hourlyWage,
        leaveDays: 0,
        normalSeconds: 0,
        workedDays: 0,
        normalPay: 0,
      }

    if (leaveType === '연차') {
      const leaveDates = enumerateInclusiveDates(
        String(row.start_date ?? ''),
        String(row.end_date ?? row.start_date ?? ''),
      ).filter((date) => date >= startDate && date <= endDate)

      for (const leaveDate of leaveDates) {
        current.leaveDays += 1
        if (parsedDateKeys.has(`${employee.employeeCode}:${leaveDate}`)) continue
        current.normalSeconds += 8 * 3600
        current.workedDays += 1
        current.normalPay += employee.hourlyWage * 8
      }
    } else if (isHalfDayLeaveType(leaveType)) {
      const leaveDate = String(row.start_date ?? '')
      if (leaveDate >= startDate && leaveDate <= endDate) {
        current.leaveDays += 0.5
        current.normalSeconds += 4 * 3600
        current.workedDays += 0.5
        current.normalPay += employee.hourlyWage * 4
      }
    } else {
      continue
    }

    creditMap.set(key, current)
  }

  return [...creditMap.values()]
}

// 직원별 월(또는 업로드 기간) 집계 — 급여계산용 핵심 출력
const employeeSummaries = computed<EmployeeSummary[]>(() => {
  const map = new Map<string, EmployeeSummary>()

  for (const row of parsedRows.value) {
    if (!map.has(row.employeeCode)) {
      map.set(row.employeeCode, {
        employeeCode: row.employeeCode,
        employeeName: row.employeeName,
        department: row.department,
        matched: row.matched,
        hourlyWage: row.hourlyWage,
        leaveDays: 0,
        totalSeconds: 0,
        normalSeconds: 0,
        overtimeSeconds: 0,
        over52Seconds: 0,
        tardyCount: 0,
        tardySeconds: 0,
        missingClockDays: 0,
        workedDays: 0,
        normalPay: 0,
        overtimePay: 0,
        totalPay: 0,
      })
    }
    const sum = map.get(row.employeeCode)!
    sum.hourlyWage = row.hourlyWage
    sum.totalSeconds += row.workSeconds
    sum.normalSeconds += row.normalSeconds
    sum.overtimeSeconds += row.overtimeSeconds
    sum.normalPay += row.normalPay
    sum.overtimePay += row.overtimePay
    sum.totalPay += row.totalPay
    if (row.workSeconds > 0) sum.workedDays++
    if (row.tardySeconds > 0) {
      sum.tardyCount++
      sum.tardySeconds += row.tardySeconds
    }
    if (row.missingClock) sum.missingClockDays++
  }

  for (const leave of leaveCredits.value) {
    const current =
      map.get(leave.employeeCode) ??
      {
        employeeCode: leave.employeeCode,
        employeeName: leave.employeeName,
        department: leave.department,
        matched: true,
        hourlyWage: leave.hourlyWage,
        leaveDays: 0,
        totalSeconds: 0,
        normalSeconds: 0,
        overtimeSeconds: 0,
        over52Seconds: 0,
        tardyCount: 0,
        tardySeconds: 0,
        missingClockDays: 0,
        workedDays: 0,
        normalPay: 0,
        overtimePay: 0,
        totalPay: 0,
      }

    current.leaveDays += leave.leaveDays
    current.totalSeconds += leave.normalSeconds
    current.normalSeconds += leave.normalSeconds
    current.workedDays += leave.workedDays
    current.normalPay += leave.normalPay
    current.totalPay += leave.normalPay
    map.set(leave.employeeCode, current)
  }

  for (const group of weeklyGroups.value) {
    const sum = map.get(group.employeeCode)
    if (!sum) continue
    sum.over52Seconds += group.over52Seconds
  }

  return [...map.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'ko'))
})

const unmatchedCodes = computed(() => {
  const set = new Set<string>()
  for (const row of parsedRows.value) if (!row.matched) set.add(row.employeeCode)
  return [...set]
})

const formatHours = (seconds: number): string => {
  if (!seconds) return '0h'
  const hours = seconds / 3600
  return `${hours.toFixed(2)}h`
}

const formatHM = (seconds: number): string => {
  if (!seconds) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const formatCurrency = (amount: number): string => `${amount.toLocaleString('ko-KR')}원`
const formatLeaveDays = (days: number): string => `${Number.isInteger(days) ? days : days.toFixed(1)}일`

const saveToDatabase = async () => {
  if (parsedRows.value.length === 0) return
  if (!(await confirm(`${parsedRows.value.length}건의 근태 로그를 저장할까요? 같은 직원/날짜는 덮어씁니다.`))) return

  saving.value = true
  savedMessage.value = ''

  try {
    const payload = parsedRows.value.map((row) => ({
      employee_code: row.employeeCode,
      raw_name: row.rawName,
      work_date: row.workDate,
      clock_in: row.clockIn,
      clock_out: row.clockOut,
      work_seconds: row.workSeconds,
      tardy_seconds: row.tardySeconds,
      early_leave_seconds: 0,
      department: row.department,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('attendance_logs')
      .upsert(payload, { onConflict: 'employee_code,work_date' })

    if (error) throw error
    savedMessage.value = `${payload.length}건 저장 완료`
  } catch (err) {
    await alert(`저장 실패: ${(err as Error).message}`)
  } finally {
    saving.value = false
  }
}

const clearRows = () => {
  parsedRows.value = []
  leaveCredits.value = []
  uploadedFileName.value = ''
  savedMessage.value = ''
}

const totalNormalSeconds = computed(() =>
  employeeSummaries.value.reduce((s, e) => s + e.normalSeconds, 0),
)
const totalOvertimeSeconds = computed(() =>
  employeeSummaries.value.reduce((s, e) => s + e.overtimeSeconds, 0),
)
const totalPayrollAmount = computed(() =>
  employeeSummaries.value.reduce((s, e) => s + e.totalPay, 0),
)
</script>

<template>
  <div class="space-y-5">
    <!-- 업로드 -->
    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-extrabold text-slate-900">근태 엑셀 업로드</h3>
        </div>
        <div class="flex items-center gap-2">
          <label class="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
            {{ uploading ? '분석 중...' : '엑셀 파일 선택' }}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              class="hidden"
              :disabled="uploading"
              @change="handleFileUpload"
            />
          </label>
          <button
            v-if="parsedRows.length > 0"
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="clearRows"
          >비우기</button>
          <button
            v-if="parsedRows.length > 0"
            type="button"
            class="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
            :disabled="saving"
            @click="saveToDatabase"
          >{{ saving ? '저장 중...' : 'DB 저장' }}</button>
        </div>
      </div>
      <p v-if="uploadedFileName" class="mt-3 text-xs font-semibold text-slate-600">
        파일: <span class="font-mono">{{ uploadedFileName }}</span> · {{ parsedRows.length }}행 파싱
      </p>
      <p v-if="savedMessage" class="mt-2 text-xs font-bold text-emerald-600">{{ savedMessage }}</p>
    </div>

    <!-- 미매칭 경고 -->
    <div v-if="unmatchedCodes.length > 0" class="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p class="text-sm font-bold text-amber-800">
        직원목록에 등록되지 않은 ID {{ unmatchedCodes.length }}개가 있습니다. (설정 페이지에서 매칭)
      </p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="code in unmatchedCodes"
          :key="code"
          class="rounded-full bg-white px-2 py-0.5 text-xs font-mono font-bold text-amber-700 ring-1 ring-amber-200"
        >{{ code }}</span>
      </div>
    </div>

    <!-- 요약 카드 -->
    <div v-if="employeeSummaries.length > 0" class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium text-slate-400">집계 인원</p>
        <p class="mt-1 text-2xl font-extrabold text-slate-900">{{ employeeSummaries.length }}명</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium text-slate-400">기본 근무시간</p>
        <p class="mt-1 text-2xl font-extrabold text-slate-900">{{ formatHours(totalNormalSeconds) }}</p>
      </div>
      <div class="rounded-xl border border-red-200 bg-red-50 p-4">
        <p class="text-xs font-medium text-red-500">연장 근무시간</p>
        <p class="mt-1 text-2xl font-extrabold text-red-700">{{ formatHours(totalOvertimeSeconds) }}</p>
      </div>
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p class="text-xs font-medium text-emerald-600">총 급여</p>
        <p class="mt-1 text-2xl font-extrabold text-emerald-700">{{ formatCurrency(totalPayrollAmount) }}</p>
      </div>
    </div>

    <!-- 직원별 집계 (급여계산용) -->
    <div v-if="employeeSummaries.length > 0" class="rounded-xl border border-slate-200 bg-white">
      <div class="border-b border-slate-200 px-4 py-3">
        <h3 class="text-sm font-extrabold text-slate-900">직원별 집계 (급여 계산용)</h3>
        <p class="mt-1 text-xs text-slate-500">기본근무는 시급 100%, 연장근무는 시급 150%로 계산합니다.</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-[13px]">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50">
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-600">이름</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-600">부서</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-600">시급</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-600">연차/반차</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-600">근무일수</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-600">총 근무</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-emerald-700">기본 근무</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-red-600">연장 근무</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-amber-700">52시간 초과</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-emerald-700">기본급</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-red-600">연장급</th>
              <th class="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-900">총급여</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="emp in employeeSummaries"
              :key="emp.employeeCode"
              class="border-b border-slate-200 last:border-0 hover:bg-slate-50"
              :class="!emp.matched ? 'bg-amber-50' : ''"
            >
              <td class="border-r border-slate-200 px-3 py-2 text-center font-bold text-slate-900">{{ emp.employeeName }}</td>
              <td class="border-r border-slate-200 px-3 py-2 text-center text-slate-600">{{ emp.department || '-' }}</td>
              <td class="border-r border-slate-200 px-3 py-2 text-center text-slate-700">
                {{ emp.hourlyWage > 0 ? formatCurrency(emp.hourlyWage) : '-' }}
              </td>
              <td class="border-r border-slate-200 px-3 py-2 text-center text-slate-700">
                {{ emp.leaveDays > 0 ? formatLeaveDays(emp.leaveDays) : '-' }}
              </td>
              <td class="border-r border-slate-200 px-3 py-2 text-center text-slate-700">{{ emp.workedDays }}일</td>
              <td class="border-r border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ formatHours(emp.totalSeconds) }}</td>
              <td class="border-r border-slate-200 px-3 py-2 text-center font-bold text-emerald-700">{{ formatHours(emp.normalSeconds) }}</td>
              <td class="border-r border-slate-200 px-3 py-2 text-center font-extrabold" :class="emp.overtimeSeconds > 0 ? 'text-red-600' : 'text-slate-400'">
                {{ emp.overtimeSeconds > 0 ? formatHours(emp.overtimeSeconds) : '-' }}
              </td>
              <td class="border-r border-slate-200 px-3 py-2 text-center font-bold" :class="emp.over52Seconds > 0 ? 'text-amber-700' : 'text-slate-400'">
                {{ emp.over52Seconds > 0 ? formatHours(emp.over52Seconds) : '-' }}
              </td>
              <td class="border-r border-slate-200 px-3 py-2 text-center font-bold text-emerald-700">{{ formatCurrency(emp.normalPay) }}</td>
              <td class="border-r border-slate-200 px-3 py-2 text-center font-bold text-red-600">{{ formatCurrency(emp.overtimePay) }}</td>
              <td class="border-r border-slate-200 px-3 py-2 text-center font-extrabold text-slate-900">{{ formatCurrency(emp.totalPay) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 일별 원본 (검증용, 접힘) -->
    <details v-if="parsedRows.length > 0" class="rounded-xl border border-slate-200 bg-white">
      <summary class="cursor-pointer px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
        일별 파싱 원본 보기 ({{ parsedRows.length }}행)
      </summary>
      <div class="max-h-[480px] overflow-auto border-t border-slate-200">
        <table class="w-full border-collapse text-xs">
          <thead class="sticky top-0 z-10">
            <tr class="border-b border-slate-200 bg-slate-50">
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">ID</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">이름</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">날짜</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">출근</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">보정출근</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">퇴근</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">보정퇴근</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">기본근무</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">연장근무</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">총급여</th>
              <th class="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-600">지각</th>
              <th class="px-2 py-2 text-center font-bold text-slate-600">부서</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in parsedRows"
              :key="`${row.employeeCode}-${row.workDate}-${idx}`"
              class="border-b border-slate-100 last:border-0"
              :class="row.missingClock ? 'bg-red-50' : !row.matched ? 'bg-amber-50' : ''"
            >
              <td class="border-r border-slate-100 px-2 py-1.5 text-center font-mono text-slate-700">{{ row.employeeCode }}</td>
              <td class="border-r border-slate-100 px-2 py-1.5 text-center text-slate-800">{{ row.employeeName }}</td>
              <td class="border-r border-slate-100 px-2 py-1.5 text-center text-slate-600">{{ row.workDate }}</td>
              <td class="border-r border-slate-100 px-2 py-1.5 text-center text-slate-600">{{ row.clockIn ?? '--' }}</td>
              <td class="border-r border-slate-100 px-2 py-1.5 text-center text-slate-600">{{ row.adjustedClockIn ?? '--' }}</td>
              <td class="border-r border-slate-100 px-2 py-1.5 text-center text-slate-600">{{ row.clockOut ?? '--' }}</td>
              <td class="border-r border-slate-100 px-2 py-1.5 text-center text-slate-600">{{ row.adjustedClockOut ?? '--' }}</td>
              <td class="border-r border-slate-100 px-2 py-1.5 text-center font-semibold text-emerald-700">{{ formatHM(row.normalSeconds) }}</td>
              <td class="border-r border-slate-100 px-2 py-1.5 text-center font-semibold text-red-600">{{ formatHM(row.overtimeSeconds) }}</td>
              <td class="border-r border-slate-100 px-2 py-1.5 text-center font-semibold text-slate-900">{{ formatCurrency(row.totalPay) }}</td>
              <td
                class="border-r border-slate-100 px-2 py-1.5 text-center"
                :class="row.tardySeconds > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'"
              >{{ row.tardySeconds > 0 ? formatHM(row.tardySeconds) : '-' }}</td>
              <td class="px-2 py-1.5 text-center text-slate-600">{{ row.department || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </div>
</template>

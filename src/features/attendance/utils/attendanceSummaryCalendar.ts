import type { AttendanceRequest } from '../types/attendance'

export interface SummaryCalendarDay {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  requests: AttendanceRequest[]
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatLocalDateKey(date = new Date()): string {
  return toDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function parseDateKey(value: string): string {
  return String(value ?? '').slice(0, 10)
}

/** 해당 날짜가 휴가 기간에 포함되는지 */
export function requestCoversDate(item: AttendanceRequest, dateKey: string): boolean {
  const start = parseDateKey(item.startDate)
  const end = parseDateKey(item.endDate)
  if (!start || !end) return false
  return start <= dateKey && end >= dateKey
}

/** 월 캘린더 셀 생성 (월요일 시작, 6주 그리드) */
export function buildSummaryCalendarDays(
  year: number,
  month: number,
  requests: AttendanceRequest[],
  todayKey = formatLocalDateKey(),
): SummaryCalendarDay[] {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  // JS: 0=일 … 6=토 → 월요 시작 오프셋
  const mondayOffset = (first.getDay() + 6) % 7

  const cells: SummaryCalendarDay[] = []

  const pushDay = (y: number, m: number, d: number, inMonth: boolean) => {
    const date = toDateKey(y, m, d)
    cells.push({
      date,
      day: d,
      inMonth,
      isToday: date === todayKey,
      requests: inMonth ? requests.filter((item) => requestCoversDate(item, date)) : [],
    })
  }

  // 이전달 채움
  if (mondayOffset > 0) {
    const prev = new Date(year, month - 1, 0)
    const prevYear = prev.getFullYear()
    const prevMonth = prev.getMonth() + 1
    const prevDays = prev.getDate()
    for (let i = mondayOffset - 1; i >= 0; i -= 1) {
      pushDay(prevYear, prevMonth, prevDays - i, false)
    }
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    pushDay(year, month, d, true)
  }

  // 다음달 채움 (최대 6주 = 42칸)
  const next = new Date(year, month, 1)
  const nextYear = next.getFullYear()
  const nextMonth = next.getMonth() + 1
  let nextDay = 1
  while (cells.length < 42) {
    pushDay(nextYear, nextMonth, nextDay, false)
    nextDay += 1
  }

  return cells
}

export function leaveTypeChipClass(leaveType: string): string {
  if (leaveType.startsWith('반차')) return 'bg-blue-100 text-blue-700'
  if (leaveType === '병가') return 'bg-purple-100 text-purple-700'
  if (leaveType === '연차') return 'bg-slate-200 text-slate-800'
  if (leaveType === '귀국휴가') return 'bg-indigo-100 text-indigo-700'
  if (leaveType === '외출') return 'bg-cyan-100 text-cyan-700'
  if (leaveType === '결근') return 'bg-rose-100 text-rose-700'
  return 'bg-orange-100 text-orange-700'
}

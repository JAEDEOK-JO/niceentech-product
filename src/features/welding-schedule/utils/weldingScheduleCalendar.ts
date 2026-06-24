import { formatIsoDate } from '@/features/welding-schedule/services/weldingSchedule.service'

export const CALENDAR_WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

export type CalendarDay = {
  key: string
  label: number
  isCurrentMonth: boolean
  isSelected: boolean
}

export const buildMonthCalendarWeeks = (monthStart: Date, selectedIso: string): CalendarDay[][] => {
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex)
      date.setHours(0, 0, 0, 0)
      return {
        key: formatIsoDate(date),
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === monthStart.getMonth(),
        isSelected: formatIsoDate(date) === String(selectedIso ?? ''),
      }
    }),
  )
}

export const formatCalendarMonthLabel = (monthStart: Date) =>
  `${monthStart.getFullYear()}년 ${String(monthStart.getMonth() + 1).padStart(2, '0')}월`

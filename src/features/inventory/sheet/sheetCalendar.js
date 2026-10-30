const pad2 = (value) => String(value).padStart(2, '0')

export const toIsoDate = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

export const CALENDAR_WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export const buildMonthCalendarWeeks = (monthStart, selectedIso) => {
  const gridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())
  const selected = String(selectedIso ?? '')
  const today = toIsoDate(new Date())

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex)
      const key = toIsoDate(date)
      return {
        key,
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === monthStart.getMonth(),
        isSelected: key === selected,
        isToday: key === today,
      }
    }),
  )
}

export const formatCalendarMonthLabel = (monthStart) =>
  `${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`

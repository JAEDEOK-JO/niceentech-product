function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getMondayOfWeek(date) {
  const safe = startOfDay(date)
  const day = safe.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  return addDays(safe, mondayOffset)
}

export function getUpcomingThursday(baseDate = new Date()) {
  const safe = startOfDay(baseDate)
  const thursday = addDays(getMondayOfWeek(safe), 3)
  return safe.getTime() > thursday.getTime() ? addDays(thursday, 7) : thursday
}

export function getDistributionWeekRange(meetingThursday = getUpcomingThursday()) {
  const start = addDays(startOfDay(meetingThursday), -7)
  return {
    start,
    end: addDays(start, 6),
    endExclusive: addDays(start, 7),
  }
}

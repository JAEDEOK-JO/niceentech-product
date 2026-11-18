export function shiftRewardDashboardMonth(year, month, delta, today = new Date()) {
  const next = new Date(year, month - 1 + delta, 1)
  const limit = new Date(today.getFullYear(), today.getMonth(), 1)
  if (next > limit) return { year, month }
  return { year: next.getFullYear(), month: next.getMonth() + 1 }
}

export function currentRewardDashboardMonth(today = new Date()) {
  return { year: today.getFullYear(), month: today.getMonth() + 1 }
}

export function isCurrentRewardDashboardMonth(year, month, today = new Date()) {
  return year === today.getFullYear() && month === today.getMonth() + 1
}

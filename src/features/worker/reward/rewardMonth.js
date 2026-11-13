export function shiftRewardMonth(offset, delta) {
  return Math.min(0, offset + delta)
}

function rewardMonthDate(offset, today) {
  return new Date(today.getFullYear(), today.getMonth() + offset, 1)
}

export function rewardMonthLabel(offset, today = new Date()) {
  const date = rewardMonthDate(offset, today)
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 포상 내역`
}

export function reportInRewardMonth(createdAt, offset, today = new Date()) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return false
  const target = rewardMonthDate(offset, today)
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth()
}

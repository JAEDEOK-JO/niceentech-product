export function noticeDragOffset(deltaX, { index, count }) {
  if (index <= 0 && deltaX > 0) return deltaX * 0.35
  if (index >= count - 1 && deltaX < 0) return deltaX * 0.35
  return deltaX
}

export function noticeDragStep(deltaX, width, { index, count }) {
  const threshold = Math.min(140, Math.max(48, width * 0.18))
  if (deltaX <= -threshold && index < count - 1) return 1
  if (deltaX >= threshold && index > 0) return -1
  return 0
}

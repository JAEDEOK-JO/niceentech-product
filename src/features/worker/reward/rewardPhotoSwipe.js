const SWIPE_DISTANCE = 56

export function swipeStep(start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (Math.abs(dx) < SWIPE_DISTANCE) return 0
  if (Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? 1 : -1
}

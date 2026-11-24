export const NOTICE_ZOOM_MIN = 1
export const NOTICE_ZOOM_MAX = 4

export function clampNoticeZoom(value) {
  return Math.min(NOTICE_ZOOM_MAX, Math.max(NOTICE_ZOOM_MIN, value))
}

export function touchSpan(touches) {
  const [first, second] = touches
  if (!first || !second) return 0
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
}

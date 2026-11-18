export const NOTICE_ZOOM_MIN = 1
export const NOTICE_ZOOM_MAX = 4

export function clampNoticeZoom(value) {
  return Math.min(NOTICE_ZOOM_MAX, Math.max(NOTICE_ZOOM_MIN, value))
}

export function noticeSwipeStep(start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (Math.abs(dx) < 56 || Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? 1 : -1
}

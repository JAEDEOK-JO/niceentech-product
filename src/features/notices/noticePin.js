export const NOTICE_PIN_LIMIT = 5

export function isNoticePinned(notice) {
  return notice?.pinned === true
}

export function noticePinCount(notices) {
  return (notices ?? []).filter((notice) => isNoticePinned(notice)).length
}

export function sortNotices(notices) {
  return [...(notices ?? [])].sort((left, right) => {
    const leftPinned = isNoticePinned(left)
    const rightPinned = isNoticePinned(right)
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1
    const leftTime = leftPinned ? left.pinned_at || left.created_at : left.created_at
    const rightTime = rightPinned ? right.pinned_at || right.created_at : right.created_at
    return String(rightTime).localeCompare(String(leftTime))
  })
}

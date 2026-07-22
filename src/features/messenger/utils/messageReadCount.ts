export type RoomReadRow = {
  user_id: string
  last_read_at: string
}

/** 메시지 미읽음 인원 수 (보낸 사람 제외, last_read_at >= created_at 이면 읽음) */
export function countMessageUnread(
  messageCreatedAt: string,
  memberUserIds: string[],
  readsByUserId: Record<string, string>,
  senderId: string,
): number {
  const createdMs = Date.parse(String(messageCreatedAt ?? ''))
  if (!Number.isFinite(createdMs)) return 0

  let unread = 0
  for (const userId of memberUserIds) {
    if (!userId || userId === senderId) continue
    const lastReadAt = readsByUserId[userId]
    if (!lastReadAt) {
      unread += 1
      continue
    }
    const readMs = Date.parse(String(lastReadAt))
    // 읽은 시각이 메시지 시각 이상이면 읽음
    if (!Number.isFinite(readMs) || readMs < createdMs) unread += 1
  }
  return unread
}

export function indexReadsByUser(rows: RoomReadRow[] = []): Record<string, string> {
  const next: Record<string, string> = {}
  for (const row of rows) {
    const userId = String(row?.user_id ?? '').trim()
    const lastReadAt = String(row?.last_read_at ?? '').trim()
    if (!userId || !lastReadAt) continue
    next[userId] = lastReadAt
  }
  return next
}

export type MentionMember = {
  user_id: string
  display_name: string
}

export type MentionSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string; userId?: string }

export type ActiveMentionRange = {
  start: number
  query: string
}

/** 캐럿 기준 활성 @멘션 구간 (공백/줄바꿈 전) */
export function getActiveMentionRange(text: string, caret: number): ActiveMentionRange | null {
  const safeCaret = Math.max(0, Math.min(caret, text.length))
  const before = text.slice(0, safeCaret)
  const atIndex = before.lastIndexOf('@')
  if (atIndex < 0) return null

  if (atIndex > 0) {
    const prev = before[atIndex - 1]
    if (prev && !/\s/.test(prev)) return null
  }

  const query = before.slice(atIndex + 1)
  if (/[\s\n]/.test(query)) return null

  return { start: atIndex, query }
}

export function filterMentionMembers(
  members: MentionMember[],
  query: string,
  excludeUserId = '',
): MentionMember[] {
  const q = String(query ?? '').trim().toLowerCase()
  return members
    .filter((m) => m.user_id && m.user_id !== excludeUserId)
    .filter((m) => {
      if (!q) return true
      return String(m.display_name ?? '').toLowerCase().includes(q)
    })
}

export function insertMentionAtRange(
  text: string,
  range: ActiveMentionRange,
  caret: number,
  displayName: string,
): { text: string; caret: number } {
  const name = String(displayName ?? '').trim()
  const token = `@${name}`
  // 입력 중 @검색어 제거 후, 본문 하단에 세로로 추가
  const withoutQuery = `${text.slice(0, range.start)}${text.slice(caret)}`
  const lines = withoutQuery.split('\n')
  const kept = lines.filter((line) => line.trim() !== token)
  const body = kept.join('\n').replace(/[ \t]+$/gm, '').replace(/\n+$/g, '')
  const next = body ? `${body}\n${token}` : token
  return { text: next, caret: next.length }
}

/** content에 남아 있는 @이름으로 mentioned ids 필터 */
export function resolveMentionedUserIds(
  content: string,
  selected: MentionMember[],
): string[] {
  const text = String(content ?? '')
  const ids: string[] = []
  for (const item of selected) {
    const name = String(item.display_name ?? '').trim()
    if (!name || !item.user_id) continue
    const token = `@${name}`
    if (!text.includes(token)) continue
    if (!ids.includes(item.user_id)) ids.push(item.user_id)
  }
  return ids
}

/** 본문과 하단 @멘션 목록 분리 */
export function splitMentionBodyAndTags(
  content: string,
  members: MentionMember[] = [],
): { body: string; mentions: Array<{ value: string; userId?: string }> } {
  const text = String(content ?? '')
  if (!text) return { body: '', mentions: [] }

  const names = [...members]
    .map((m) => ({
      userId: m.user_id,
      name: String(m.display_name ?? '').trim(),
    }))
    .filter((m) => m.name)
    .sort((a, b) => b.name.length - a.name.length)

  const mentions: Array<{ value: string; userId?: string }> = []
  const seen = new Set<string>()
  let body = text

  if (names.length > 0) {
    const escaped = names.map((n) => n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const re = new RegExp(`@(?:${escaped.join('|')})`, 'g')
    let match = re.exec(text)
    while (match) {
      const raw = match[0]
      if (!seen.has(raw)) {
        seen.add(raw)
        const found = names.find((n) => n.name === raw.slice(1))
        mentions.push({ value: raw, userId: found?.userId })
      }
      match = re.exec(text)
    }
    body = text
      .replace(re, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim()
  }

  return { body, mentions }
}

export function splitMentionSegments(
  content: string,
  members: MentionMember[] = [],
): MentionSegment[] {
  const { body, mentions } = splitMentionBodyAndTags(content, members)
  const segments: MentionSegment[] = []
  if (body) segments.push({ type: 'text', value: body })
  for (const item of mentions) {
    segments.push({ type: 'mention', value: item.value, userId: item.userId })
  }
  return segments.length > 0 ? segments : [{ type: 'text', value: String(content ?? '') }]
}

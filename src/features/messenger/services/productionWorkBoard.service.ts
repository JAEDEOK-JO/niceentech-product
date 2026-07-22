import { supabase } from '@/lib/supabase'

export type WorkBoardTab = 'open' | 'done'

export type WorkBoardDisplayKind = 'request' | 'confirm' | 'recheck'

export type WorkBoardMessage = {
  id: string
  room_id: string
  sender_id: string | null
  sender_name: string
  content: string
  file_type: string
  file_url: string
  created_at: string
}

export type WorkBoardItem = {
  id: string
  sourceMessageId: string
  displayKind: WorkBoardDisplayKind
  message: WorkBoardMessage
}

const PAGE_SIZE = 10

function mapRow(row: Record<string, unknown>): WorkBoardItem | null {
  const id = String(row.id ?? '').trim()
  if (!id) return null
  const displayKind = String(row.display_kind ?? 'request').trim() as WorkBoardDisplayKind
  const sourceMessageId = String(row.source_message_id ?? id).trim()
  return {
    id,
    sourceMessageId,
    displayKind:
      displayKind === 'confirm' || displayKind === 'recheck' || displayKind === 'request'
        ? displayKind
        : 'request',
    message: {
      id,
      room_id: String(row.room_id ?? ''),
      sender_id: row.sender_id ? String(row.sender_id) : null,
      sender_name: String(row.sender_name ?? ''),
      content: String(row.content ?? ''),
      file_type: String(row.file_type ?? ''),
      file_url: String(row.file_url ?? ''),
      created_at: String(row.created_at ?? ''),
    },
  }
}

export async function fetchWorkBoardPage(input: {
  roomId: string
  tab: WorkBoardTab
  offset?: number
  limit?: number
}): Promise<{ ok: true; items: WorkBoardItem[]; hasMore: boolean } | { ok: false; reason: string }> {
  const limit = Math.max(input.limit ?? PAGE_SIZE, 1)
  const offset = Math.max(input.offset ?? 0, 0)

  const { data, error } = await supabase.rpc('list_chat_production_work_board', {
    p_room_id: input.roomId,
    p_tab: input.tab,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) return { ok: false, reason: error.message }

  const payload = data && typeof data === 'object' ? (data as { items?: unknown }) : null
  const rawItems = Array.isArray(payload?.items) ? payload.items : []
  const items = rawItems
    .map((row) => (row && typeof row === 'object' ? mapRow(row as Record<string, unknown>) : null))
    .filter((item): item is WorkBoardItem => Boolean(item))

  return { ok: true, items, hasMore: items.length >= limit }
}

export { PAGE_SIZE as WORK_BOARD_PAGE_SIZE }

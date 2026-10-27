import { supabase } from '@/lib/supabase'

function historyDateLabel(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function historyActionLabel(action) {
  return action === 'deleted' ? '삭제' : '등록'
}

export async function fetchDrawingFileHistory(productListId) {
  const id = Number(productListId)
  if (!id) return []

  const { data, error } = await supabase
    .from('drawing_file_history')
    .select('id, file_name, action, created_at')
    .eq('product_list_id', id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error) return []

  return (data ?? []).map((row) => ({
    id: row.id,
    fileName: String(row.file_name ?? '').trim(),
    action: row.action === 'deleted' ? 'deleted' : 'registered',
    dateLabel: historyDateLabel(row.created_at),
    actionLabel: historyActionLabel(row.action),
  }))
}

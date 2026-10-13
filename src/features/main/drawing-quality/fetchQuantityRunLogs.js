import { supabase } from '@/lib/supabase'

const VISIBLE_STATES = ['done', 'review', 'failed', 'pending', 'surveying', 'reading', 'zooming']

export function productionTestDate(iso) {
  const matched = String(iso ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return ''
  return `${matched[1]}년 ${matched[2]}월 ${matched[3]}일`
}

export function quantityLogStatus(state) {
  if (state === 'failed') return '실패'
  if (state === 'done' || state === 'review') return '완료'
  return '파악중'
}

export async function fetchQuantityRunLogs(testDate) {
  const date = String(testDate ?? '').trim()
  if (!date) return []
  const { data, error } = await supabase
    .from('drawing_quantity_runs')
    .select('id, drawing_no, company, place, area, state, result_message, finished_at, created_at')
    .eq('test_date', date)
    .in('state', VISIBLE_STATES)
    .order('finished_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

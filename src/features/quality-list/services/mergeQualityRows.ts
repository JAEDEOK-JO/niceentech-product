import { supabase } from '@/lib/supabase'
import type { QualityListRow } from '@/features/quality-list/types/quality'
import { discardQualityMergeBackup, saveQualityMergeBackup } from '@/features/quality-list/services/qualityMergeBackup'

const COUNT_FIELDS = ['a32', 'a40', 'a50', 'a65', 'm65', 'm80', 'm100', 'm125', 'm150', 'm200'] as const
const MAIN_FIELDS = ['a32', 'a40', 'a50', 'a65'] as const

export type MergeQualityInput = {
  initial: string
  area: string
}

function sameSite(rows: QualityListRow[]) {
  const company = rows[0]?.company ?? ''
  const place = rows[0]?.place ?? ''
  return rows.every((row) => row.company === company && row.place === place)
}

function sumField(rows: QualityListRow[], field: (typeof COUNT_FIELDS)[number]) {
  return rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0)
}

export async function mergeQualityRows(rows: QualityListRow[], input: MergeQualityInput) {
  if (rows.length < 2) throw new Error('합칠 항목을 두 개 이상 선택해 주세요.')
  if (!sameSite(rows)) throw new Error('회사명과 현장명이 같아야 합니다.')

  const keeper = rows[0]
  const counts = Object.fromEntries(COUNT_FIELDS.map((field) => [field, sumField(rows, field)]))
  const totalH = COUNT_FIELDS.reduce((sum, field) => sum + Number(counts[field] ?? 0), 0)
  const initial = input.initial.trim()
  const area = input.area.trim()
  const print = MAIN_FIELDS.some((field) => Number(counts[field] ?? 0) > 0)
  const backupId = await saveQualityMergeBackup(keeper.id, rows.map((row) => row.id))

  const updated = await supabase
    .from('quality_list')
    .update({
      initial,
      area,
      ...counts,
      totalH,
      print,
      lot_round: null,
      lot_type: null,
      lot_ksd: null,
      lot_certification: null,
      lot_ksd_num: null,
      lot_nameH: null,
      lot_numH: null,
      lot_number_startH: 0,
      lot_number_endH: 0,
      full_text: `${keeper.company} ${keeper.place} ${area} ${initial}`.trim().replace(/\s+/g, ' '),
    })
    .eq('id', keeper.id)
    .select('id')

  if (updated.error || !updated.data?.length) {
    await discardQualityMergeBackup(backupId)
    throw updated.error ?? new Error('합치기에 실패했습니다.')
  }

  const removed = await supabase
    .from('quality_list')
    .delete()
    .in('id', rows.slice(1).map((row) => row.id))
    .select('id')

  if (removed.error) throw removed.error
}

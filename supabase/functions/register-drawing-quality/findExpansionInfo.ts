import type { SupabaseClient } from 'npm:@supabase/supabase-js'

const LOT_META: Record<string, { lotKsd: string; lotCertification: string; lotKsdNum: string }> = {
  백관: { lotKsd: 'KSD 3507', lotCertification: '분기 25-36', lotKsdNum: '' },
  스케쥴: { lotKsd: 'KSD 3562', lotCertification: '분기 12-9', lotKsdNum: 'sch40' },
  서스: { lotKsd: 'KSD 3576', lotCertification: '분기 11-39', lotKsdNum: '' },
  수파이프: { lotKsd: 'KSD 3595', lotCertification: '분기 23-2', lotKsdNum: '' },
}

export type ExpansionInfo = {
  lot_round: string
  lot_type: string
  lot_ksd: string
  lot_certification: string
  lot_ksd_num: string
  lot_nameH: string
  lot_numH: number
}

export async function findExpansionInfo(supabase: SupabaseClient, testDate: string): Promise<ExpansionInfo | null> {
  if (!testDate) return null

  const response = await supabase
    .from('quality_list_info')
    .select('lot_round, lot_type, lot_name, lot_num')
    .eq('test_date', testDate)
    .order('no', { ascending: true })

  if (response.error || !response.data?.length) return null

  const firstRound = response.data.find((row) => String(row.lot_round ?? '').trim() === '1차')
  const picked = firstRound ?? response.data[0]
  const lotName = String(picked?.lot_name ?? '').trim()
  const lotNum = Number(picked?.lot_num ?? 0)
  if (!lotName || !lotNum) return null

  const lotType = String(picked?.lot_type ?? '').trim() || '백관'
  const meta = LOT_META[lotType] ?? LOT_META.백관

  return {
    lot_round: String(picked?.lot_round ?? '').trim() || '1차',
    lot_type: lotType,
    lot_ksd: meta.lotKsd,
    lot_certification: meta.lotCertification,
    lot_ksd_num: meta.lotKsdNum,
    lot_nameH: lotName,
    lot_numH: lotNum,
  }
}

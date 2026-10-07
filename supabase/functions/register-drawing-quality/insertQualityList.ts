import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import { findExpansionInfo } from './findExpansionInfo.ts'
import { hasMainPipe, totalQuantity, type DrawingQuantities } from './quantityFields.ts'

type PlanRow = {
  company: string
  place: string
  area: string
  initial: string
  testDate: string
  companyId: number | null
}

const EMPTY_LOT = {
  lot_round: '1차',
  lot_type: '백관',
  lot_ksd: 'KSD 3507',
  lot_certification: '분기 25-36',
  lot_ksd_num: '',
  lot_nameH: null,
  lot_numH: null,
}

async function resolveCompanyId(supabase: SupabaseClient, row: PlanRow) {
  if (row.companyId && row.companyId > 0) return row.companyId

  const response = await supabase
    .from('company_list')
    .select('id')
    .eq('company', row.company)
    .eq('place', row.place)
    .maybeSingle()

  if (response.error) throw new Error(response.error.message)
  const id = Number(response.data?.id ?? 0)
  return id > 0 ? id : null
}

async function nextSort(supabase: SupabaseClient, testDate: string) {
  const [latestSort, countResult] = await Promise.all([
    supabase
      .from('quality_list')
      .select('sort')
      .eq('test_date', testDate)
      .not('sort', 'is', null)
      .order('sort', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('quality_list').select('id', { count: 'exact', head: true }).eq('test_date', testDate),
  ])

  if (latestSort.error) throw new Error(latestSort.error.message)
  if (countResult.error) throw new Error(countResult.error.message)

  const maxSort = latestSort.data?.sort == null ? -1 : Number(latestSort.data.sort)
  return Math.max(maxSort + 1, countResult.count ?? 0)
}

export async function insertQualityList(
  supabase: SupabaseClient,
  row: PlanRow,
  quantities: DrawingQuantities,
) {
  const companyId = await resolveCompanyId(supabase, row)
  if (!companyId) throw new Error('company_missing')
  if (!row.testDate) throw new Error('test_date_missing')

  const expansion = await findExpansionInfo(supabase, row.testDate)
  const total = totalQuantity(quantities)
  const payload: Record<string, unknown> = {
    company_id: companyId,
    company: row.company,
    place: row.place,
    area: row.area,
    initial: row.initial,
    test_date: row.testDate,
    ...(expansion ?? EMPTY_LOT),
    lot_number_startH: 0,
    lot_number_endH: 0,
    totalH: total,
    print: hasMainPipe(quantities),
    full_text: `${row.company} ${row.place} ${row.area} ${row.initial} ${expansion?.lot_nameH ?? ''} ${expansion?.lot_numH ?? ''}`
      .trim()
      .replace(/\s+/g, ' '),
    sort: await nextSort(supabase, row.testDate),
    ...quantities,
  }

  const response = await supabase.from('quality_list').insert(payload).select('id').single()
  if (response.error) throw new Error(response.error.message)
  return Number(response.data.id)
}

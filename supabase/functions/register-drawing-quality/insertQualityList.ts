import type { SupabaseClient } from 'npm:@supabase/supabase-js'
import { hasMainPipe, totalQuantity, type DrawingQuantities } from './quantityFields.ts'

type PlanRow = {
  company: string
  place: string
  area: string
  initial: string
  testDate: string
  companyId: number | null
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

  const total = totalQuantity(quantities)
  const payload: Record<string, unknown> = {
    company_id: companyId,
    company: row.company,
    place: row.place,
    area: row.area,
    initial: row.initial,
    test_date: row.testDate,
    lot_round: null,
    lot_type: null,
    lot_ksd: null,
    lot_certification: null,
    lot_ksd_num: null,
    lot_nameH: null,
    lot_numH: null,
    lot_number_startH: 0,
    lot_number_endH: 0,
    totalH: total,
    print: hasMainPipe(quantities),
    full_text: `${row.company} ${row.place} ${row.area} ${row.initial}`.trim().replace(/\s+/g, ' '),
    sort: await nextSort(supabase, row.testDate),
    ...quantities,
  }

  const response = await supabase.from('quality_list').insert(payload).select('id').single()
  if (response.error) throw new Error(response.error.message)
  return Number(response.data.id)
}

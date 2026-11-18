import type { SupabaseClient } from 'npm:@supabase/supabase-js'

type PlanMatch = {
  test_date?: string | null
  initial?: string | null
  company?: string | null
  place?: string | null
  area?: string | null
}

export async function hasQualityList(supabase: SupabaseClient, row: PlanMatch) {
  const testDate = String(row.test_date ?? '').trim()
  const company = String(row.company ?? '').trim()
  const place = String(row.place ?? '').trim()
  const area = String(row.area ?? '').trim()
  const initial = String(row.initial ?? '').trim()
  if (!testDate || !company || !initial) return false

  let query = supabase
    .from('quality_list')
    .select('id')
    .eq('test_date', testDate)
    .eq('company', company)
    .eq('place', place)
    .eq('initial', initial)
    .limit(1)
  query = area ? query.eq('area', area) : query.or('area.is.null,area.eq.')

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0
}

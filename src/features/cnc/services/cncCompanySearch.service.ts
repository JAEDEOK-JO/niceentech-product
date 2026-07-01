import { supabase } from '@/lib/supabase'
import type { CncCompanySearchResult } from '../types/cnc'

export async function searchCncCompanies(term: string): Promise<CncCompanySearchResult[]> {
  const keyword = String(term ?? '').trim()
  if (!keyword) return []

  const { data, error } = await supabase
    .from('company_list')
    .select('id,company,place,full_name,manager_id,initial')
    .ilike('full_name', `%${keyword}%`)
    .order('full_name', { ascending: true })
    .limit(30)

  if (error) throw error

  const managerIds = [...new Set((data ?? []).map((item) => item.manager_id).filter(Boolean))]
  let managerNameMap: Record<string, string> = {}

  if (managerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name')
      .in('id', managerIds)

    managerNameMap = Object.fromEntries(
      (profiles ?? []).map((item) => [String(item.id), String(item.name ?? '').trim()]),
    )
  }

  return (data ?? []).map((item) => ({
    id: Number(item.id ?? 0),
    company: String(item.company ?? '').trim(),
    place: String(item.place ?? '').trim(),
    fullName: String(item.full_name ?? '').trim(),
    drawingNo: String(item.initial ?? '').trim(),
    managerName: String(managerNameMap[item.manager_id] ?? '').trim() || '담당자 미지정',
  }))
}

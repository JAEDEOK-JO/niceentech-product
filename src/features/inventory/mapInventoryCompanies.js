import { parseApprovedMaterialNames } from '@/features/company/approvedMaterials'
import { supabase } from '@/lib/supabase'

export const mapInventoryCompanies = (rows, managerNameById = new Map()) =>
  (rows ?? []).map((row) => ({
    ...row,
    managerName: String(managerNameById.get(row.manager_id) ?? '').trim(),
    approvedMaterials: parseApprovedMaterialNames(row.approved_materials),
  }))

export const fetchManagerNameById = async (managerIds) => {
  const ids = [...new Set((managerIds ?? []).filter(Boolean))]
  if (ids.length === 0) return new Map()

  const { data, error } = await supabase
    .from('profiles')
    .select('id,name')
    .in('id', ids)

  if (error) throw error
  return new Map((data ?? []).map((item) => [item.id, String(item.name ?? '').trim()]))
}

import { supabase } from '@/lib/supabase'
import { parseApprovedMaterialNames, uniqueApprovedMaterialNames, normalizeApprovedMaterialName } from './approvedMaterials'

const isMissingApprovedMaterialsColumn = (error) => {
  const message = String(error?.message ?? '').toLowerCase()
  return message.includes('approved_materials') && (message.includes('does not exist') || message.includes('schema cache'))
}

export const fetchApprovedMaterialBrandOptions = async () => {
  const { data, error } = await supabase.from('company_list').select('approved_materials')
  if (error) {
    if (isMissingApprovedMaterialsColumn(error)) return []
    throw error
  }
  return uniqueApprovedMaterialNames((data ?? []).flatMap((row) => row.approved_materials ?? []))
}

export const updateCompanyApprovedMaterials = async (companyId, names) => {
  const approvedMaterials = uniqueApprovedMaterialNames(names)
  const { error } = await supabase
    .from('company_list')
    .update({ approved_materials: approvedMaterials })
    .eq('id', Number(companyId))
  if (error) throw error
  return approvedMaterials
}

export const parseCompanyApprovedMaterials = (row) => parseApprovedMaterialNames(row?.approved_materials)

export const fetchCompaniesUsingApprovedMaterial = async (brand) => {
  const name = normalizeApprovedMaterialName(brand)
  if (!name) return []
  const { data, error } = await supabase
    .from('company_list')
    .select('id,company,place,full_name,approved_materials')
    .contains('approved_materials', [name])
  if (error) throw error
  return data ?? []
}

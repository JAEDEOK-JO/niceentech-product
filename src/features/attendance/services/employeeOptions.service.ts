import { supabase } from '@/lib/supabase'

export type EmployeeOptionCategory = 'department' | 'assigned_department' | 'nationality'

export interface EmployeeOptionSetting {
  id: number
  category: EmployeeOptionCategory
  value: string
  sortOrder: number
}

export interface EmployeeOptionGroups {
  departments: string[]
  assignedDepartments: string[]
  nationalities: string[]
}

export const DEFAULT_EMPLOYEE_OPTIONS: EmployeeOptionGroups = {
  departments: ['생산부', '용접부', '나사부', 'CNC', '지게차'],
  assignedDepartments: ['메인관', '가지관', '치부', '포장', '용접', '나사', 'CNC', '페인트', '지게차'],
  nationalities: ['한국', '중국', '태국', '러시아', '파키스탄'],
}

const CATEGORY_TO_GROUP: Record<EmployeeOptionCategory, keyof EmployeeOptionGroups> = {
  department: 'departments',
  assigned_department: 'assignedDepartments',
  nationality: 'nationalities',
}

const toSetting = (row: Record<string, unknown>): EmployeeOptionSetting => ({
  id: Number(row.id ?? 0),
  category: String(row.category ?? 'department') as EmployeeOptionCategory,
  value: String(row.value ?? ''),
  sortOrder: Number(row.sort_order ?? 0),
})

export function buildEmployeeOptionGroups(settings: EmployeeOptionSetting[]): EmployeeOptionGroups {
  const groups: EmployeeOptionGroups = {
    departments: [],
    assignedDepartments: [],
    nationalities: [],
  }

  for (const setting of settings) {
    const group = CATEGORY_TO_GROUP[setting.category]
    if (!group || !setting.value.trim()) continue
    groups[group].push(setting.value.trim())
  }

  return groups
}

export async function fetchEmployeeOptionSettings(): Promise<EmployeeOptionSetting[]> {
  const { data, error } = await supabase
    .from('employee_option_settings')
    .select('id, category, value, sort_order')
    .order('category')
    .order('sort_order')
    .order('value')

  if (error) throw error
  return (data ?? []).map((row) => toSetting(row as Record<string, unknown>))
}

export async function fetchEmployeeOptionGroups(): Promise<EmployeeOptionGroups> {
  const settings = await fetchEmployeeOptionSettings()
  return settings.length > 0 ? buildEmployeeOptionGroups(settings) : DEFAULT_EMPLOYEE_OPTIONS
}

export async function createEmployeeOptionSetting(
  category: EmployeeOptionCategory,
  value: string,
): Promise<EmployeeOptionSetting> {
  const trimmed = value.trim()
  const { data: existing, error: existingError } = await supabase
    .from('employee_option_settings')
    .select('sort_order')
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)

  if (existingError) throw existingError

  const nextOrder = Number(existing?.[0]?.sort_order ?? -1) + 1
  const { data, error } = await supabase
    .from('employee_option_settings')
    .insert({ category, value: trimmed, sort_order: nextOrder })
    .select('id, category, value, sort_order')
    .single()

  if (error) throw error
  return toSetting(data as Record<string, unknown>)
}

export async function updateEmployeeOptionSetting(id: number, value: string): Promise<void> {
  const { error } = await supabase
    .from('employee_option_settings')
    .update({ value: value.trim() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteEmployeeOptionSetting(id: number): Promise<void> {
  const { error } = await supabase.from('employee_option_settings').delete().eq('id', id)
  if (error) throw error
}

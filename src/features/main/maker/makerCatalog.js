import { supabase } from '@/lib/supabase'

export async function fetchMakerCatalog() {
  const { data, error } = await supabase.from('maker_catalog').select('name').order('created_at', { ascending: true })
  if (error) return []
  return (data ?? []).map((row) => String(row.name ?? '').trim()).filter(Boolean)
}

export async function addMakerCatalog(name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return false
  const { error } = await supabase.from('maker_catalog').insert({ name: trimmed })
  if (!error) return true
  if (error.code === '23505') return true
  return false
}

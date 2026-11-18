import { supabase } from '@/lib/supabase'
import { reloadOwnCapabilities } from '@/features/access/userCapabilityStore'

const PROFILE_COLUMNS = 'id, name, department, role'

export async function fetchCapabilityDirectory() {
  const [profilesResult, grantsResult] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).order('name'),
    supabase.from('user_capability_grants').select('user_id, capability, detail'),
  ])
  if (profilesResult.error) throw profilesResult.error
  if (grantsResult.error) throw grantsResult.error

  const profiles = (profilesResult.data ?? []).map((row) => ({
    id: row.id,
    name: String(row.name ?? '').trim(),
    department: String(row.department ?? '').trim(),
    role: String(row.role ?? '').trim(),
  })).filter((row) => row.name)

  return {
    profiles,
    grants: grantsResult.data ?? [],
  }
}

export async function grantCapability(userId, capability, detail = '') {
  const { error } = await supabase.from('user_capability_grants').insert({
    user_id: userId,
    capability,
    detail,
  })
  if (error) throw error
  await reloadOwnCapabilities()
}

export async function revokeCapability(userId, capability, detail = '') {
  const { error } = await supabase
    .from('user_capability_grants')
    .delete()
    .eq('user_id', userId)
    .eq('capability', capability)
    .eq('detail', detail)
  if (error) throw error
  await reloadOwnCapabilities()
}

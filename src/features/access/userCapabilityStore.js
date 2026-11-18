import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { CAPABILITY } from '@/features/access/capabilityCatalog'

export const capabilitiesReady = ref(false)
const ownCapabilities = ref(new Set())
const ownScopes = ref([])
let loadedUserId = ''

export function hasOwnCapability(capability) {
  return ownCapabilities.value.has(capability)
}

export function ownAttendanceScopes() {
  return ownScopes.value
}

export async function loadOwnCapabilities(userId) {
  const id = String(userId ?? '').trim()
  loadedUserId = id
  if (!id) {
    ownCapabilities.value = new Set()
    ownScopes.value = []
    capabilitiesReady.value = true
    return
  }

  const { data, error } = await supabase
    .from('user_capability_grants')
    .select('capability, detail')
    .eq('user_id', id)

  if (error) {
    capabilitiesReady.value = false
    return
  }

  const capabilities = new Set()
  const scopes = []
  for (const row of data ?? []) {
    if (row.capability === CAPABILITY.attendanceScope) {
      const department = String(row.detail ?? '').trim()
      if (department) scopes.push(department)
      continue
    }
    capabilities.add(row.capability)
  }
  ownCapabilities.value = capabilities
  ownScopes.value = scopes
  capabilitiesReady.value = true
}

export async function reloadOwnCapabilities() {
  if (!loadedUserId) return
  await loadOwnCapabilities(loadedUserId)
}

import { supabase } from '@/lib/supabase'
import { PROFILE_ROLES } from '@/constants/profileOptions'
import { approveWorker } from '@/features/settings/services/workerApproval.service'

export async function fetchWorkerSignups() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,email,assigned_department,activate,created_at')
    .eq('role', PROFILE_ROLES.worker)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export { approveWorker }

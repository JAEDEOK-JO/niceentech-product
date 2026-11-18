import { CAPABILITY } from '@/features/access/capabilityCatalog'
import { capabilitiesReady, hasOwnCapability } from '@/features/access/userCapabilityStore'
import { isRootAdmin } from '@/utils/adminAccess'

const WELDING_SCHEDULE_MANAGER_NAMES = ['안상기', '김호연']
const WELDING_SCHEDULE_MANAGER_IDS = [
  '3ec64475-f378-4852-918c-698fe3c9374d',
  '790954f2-f27a-41c3-add8-5eab4da86f4e',
]

export const WELDING_SCHEDULE_PERMISSION_ERROR = '용접일정 수정 권한이 없습니다.'

export type WeldingSchedulePermissionProfile = {
  id?: string
  name?: string
  role?: string
}

export const canManageWeldingSchedule = (profile: WeldingSchedulePermissionProfile | null | undefined) => {
  const userId = String(profile?.id ?? '').trim()
  if (!userId) return false
  if (isRootAdmin(profile?.role)) return true
  if (capabilitiesReady.value) return hasOwnCapability(CAPABILITY.weldingSchedule)

  if (WELDING_SCHEDULE_MANAGER_IDS.includes(userId)) return true
  const name = String(profile?.name ?? '').trim()
  return WELDING_SCHEDULE_MANAGER_NAMES.includes(name)
}

export const isWeldingScheduleUpdate = (updates: Record<string, unknown> | null | undefined) => {
  if (!updates) return false
  return (
    Object.prototype.hasOwnProperty.call(updates, 'welding_schedule_date') ||
    Object.prototype.hasOwnProperty.call(updates, 'welding_schedule_inspector')
  )
}

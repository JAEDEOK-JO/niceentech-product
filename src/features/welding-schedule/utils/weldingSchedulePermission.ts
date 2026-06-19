import { isRootAdmin } from '@/utils/adminAccess'

export const WELDING_SCHEDULE_MANAGER_NAMES = ['안상기', '김호연'] as const

export const WELDING_SCHEDULE_MANAGER_IDS = [
  '3ec64475-f378-4852-918c-698fe3c9374d',
  '790954f2-f27a-41c3-add8-5eab4da86f4e',
] as const

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

  if (WELDING_SCHEDULE_MANAGER_IDS.includes(userId as (typeof WELDING_SCHEDULE_MANAGER_IDS)[number])) {
    return true
  }

  const name = String(profile?.name ?? '').trim()
  return WELDING_SCHEDULE_MANAGER_NAMES.includes(name as (typeof WELDING_SCHEDULE_MANAGER_NAMES)[number])
}

export const isWeldingScheduleUpdate = (updates: Record<string, unknown> | null | undefined) => {
  if (!updates) return false
  return (
    Object.prototype.hasOwnProperty.call(updates, 'welding_schedule_date') ||
    Object.prototype.hasOwnProperty.call(updates, 'welding_schedule_inspector')
  )
}

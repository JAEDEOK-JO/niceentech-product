import { computed, type Ref } from 'vue'
import { useProfile } from '@/composables/useProfile'
import { canManageWeldingSchedule } from '@/features/welding-schedule/utils/weldingSchedulePermission'

export const useWeldingSchedulePermission = (session: Ref<{ user?: { id?: string } } | null>) => {
  const { profile } = useProfile(session)
  const canManageWeldingSchedulePermission = computed(() => canManageWeldingSchedule(profile.value))

  return {
    profile,
    canManageWeldingSchedule: canManageWeldingSchedulePermission,
  }
}

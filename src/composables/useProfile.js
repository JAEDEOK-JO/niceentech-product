import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'

export function useProfile(session) {
  const profile = ref(null)
  const ready = ref(false)

  const fetchProfile = async () => {
    if (!session.value?.user?.id) {
      profile.value = null
      ready.value = true
      return
    }

    ready.value = false
    const { data, error } = await supabase
      .from('profiles')
      .select('id,name,position,department,assigned_department,role,work_man,activate')
      .eq('id', session.value.user.id)
      .maybeSingle()

    if (error) {
      profile.value = null
      ready.value = true
      return
    }

    profile.value = {
      ...data,
      role: data?.role || '일반',
      work_man: data?.work_man || '없음',
    }
    ready.value = true
  }

  watch(
    session,
    async () => {
      await fetchProfile()
    },
    { immediate: true },
  )

  return {
    profile,
    ready,
    fetchProfile,
  }
}

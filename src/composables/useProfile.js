import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'

export function useProfile(session) {
  const profile = ref(null)

  const fetchProfile = async () => {
    if (!session.value?.user?.id) {
      profile.value = null
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id,name,position,department,work_man')
      .eq('id', session.value.user.id)
      .maybeSingle()

    if (error) {
      profile.value = null
      return
    }

    profile.value = {
      ...data,
      work_man: data?.work_man || '없음',
    }
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
    fetchProfile,
  }
}

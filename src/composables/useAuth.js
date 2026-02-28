import { onMounted, onUnmounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const session = ref(null)
  const loading = ref(false)
  const message = ref('')
  let authSubscription = null

  const toEmail = (raw) => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    if (trimmed.includes('@')) return trimmed
    return `${trimmed}@niceentech.kr`
  }

  const login = async ({ id, password }) => {
    const email = toEmail(id)
    if (!email || !password) {
      message.value = '아이디와 비밀번호를 입력해주세요.'
      return false
    }

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      message.value = 'Supabase 환경변수(.env) 설정이 필요합니다.'
      return false
    }

    loading.value = true
    message.value = ''
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    loading.value = false

    if (error) {
      const raw = (error.message || '').toLowerCase()
      if (raw.includes('invalid login credentials')) {
        message.value = '아이디 또는 비밀번호가 올바르지 않습니다.'
        return false
      }
      if (raw.includes('email not confirmed')) {
        message.value = '이메일 인증이 완료되지 않았습니다.'
        return false
      }
      message.value = `로그인 실패: ${error.message}`
      return false
    }

    message.value = '로그인 성공'
    return true
  }

  const logout = async () => {
    await supabase.auth.signOut()
    message.value = '로그아웃되었습니다.'
  }

  onMounted(async () => {
    const { data } = await supabase.auth.getSession()
    session.value = data.session

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      session.value = nextSession
    })
    authSubscription = listener.subscription
  })

  onUnmounted(() => {
    authSubscription?.unsubscribe()
  })

  return {
    session,
    loading,
    message,
    login,
    logout,
  }
}

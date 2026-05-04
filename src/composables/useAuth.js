import { onMounted, onUnmounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'

// 모듈 단위 플래그: 사용자가 명시적으로 로그아웃 버튼을 눌렀는지 여부
// 다중 기기/탭 사용 시 토큰 갱신 실패로 발생하는 자동 SIGNED_OUT을 무시하기 위함
let isManualLogout = false

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
    isManualLogout = true
    try {
      await supabase.auth.signOut()
    } finally {
      // 약간의 지연 후 플래그 리셋 (auth 이벤트 콜백이 먼저 실행되도록)
      setTimeout(() => { isManualLogout = false }, 500)
    }
    message.value = '로그아웃되었습니다.'
  }

  onMounted(async () => {
    const { data } = await supabase.auth.getSession()
    session.value = data.session

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // 사용자가 직접 로그아웃을 누른 게 아니면 SIGNED_OUT 무시
      // (토큰 갱신 실패, 다중 기기 동시 사용 등으로 인한 자동 로그아웃 방지)
      if (event === 'SIGNED_OUT' && !isManualLogout) {
        return
      }
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

import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { isElectronApp } from '@/utils/device'
import {
  fetchVirtualKeyboardEnabled,
  updateVirtualKeyboardEnabled,
} from '@/features/virtual-keyboard/services/virtualKeyboardSetting.service'

const enabled = ref(false)
const loading = ref(false)
const saving = ref(false)
let channel = null
let bootstrapped = false

async function refresh() {
  loading.value = true
  try {
    enabled.value = await fetchVirtualKeyboardEnabled()
  } catch {
    enabled.value = false
  } finally {
    loading.value = false
  }
}

function startRealtime() {
  if (channel) return
  channel = supabase
    .channel('setting-virtual-keyboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'setting' }, async () => {
      await refresh()
    })
    .subscribe()
}

export function isWebVirtualKeyboardHost() {
  if (typeof window === 'undefined') return false
  if (isElectronApp()) return false
  const ua = navigator.userAgent || ''
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk/i.test(ua)) {
    return false
  }
  return true
}

export function bootstrapVirtualKeyboardSetting() {
  if (bootstrapped) return
  bootstrapped = true
  void refresh()
  startRealtime()
}

export function useVirtualKeyboardSetting() {
  if (!bootstrapped) bootstrapVirtualKeyboardSetting()

  const setEnabled = async (next) => {
    saving.value = true
    try {
      enabled.value = await updateVirtualKeyboardEnabled(next)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error?.message || '저장에 실패했습니다.' }
    } finally {
      saving.value = false
    }
  }

  return {
    enabled,
    loading,
    saving,
    refresh,
    setEnabled,
    isWebHost: isWebVirtualKeyboardHost,
  }
}

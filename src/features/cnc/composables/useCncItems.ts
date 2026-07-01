import { onMounted, onUnmounted, ref } from 'vue'
import {
  fetchCncItems,
  subscribeCncItems,
  unsubscribeCncItems,
} from '../services/cnc.service'
import { sortCncItems } from '../utils/cncDate'
import type { CncItem } from '../types/cnc'

export function useCncItems() {
  const items = ref<CncItem[]>([])
  const loading = ref(false)
  let channel: ReturnType<typeof subscribeCncItems> | null = null

  const applySortedItems = (nextItems: CncItem[]) => {
    items.value = sortCncItems(nextItems)
  }

  const refresh = async ({ silent = false } = {}) => {
    if (!silent) loading.value = true
    try {
      items.value = await fetchCncItems()
    } catch {
      if (!silent) items.value = []
    } finally {
      if (!silent) loading.value = false
    }
  }

  const stop = () => {
    if (channel) {
      unsubscribeCncItems(channel)
      channel = null
    }
  }

  const start = async () => {
    stop()
    await refresh()
    channel = subscribeCncItems(() => {
      void refresh({ silent: true })
    })
  }

  onMounted(() => {
    void start()
  })

  onUnmounted(() => {
    stop()
  })

  return {
    items,
    loading,
    refresh,
    applySortedItems,
  }
}

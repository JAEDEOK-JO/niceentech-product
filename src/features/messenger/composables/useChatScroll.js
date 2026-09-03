import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const NEAR_BOTTOM_PX = 96

function isNearBottom(el, threshold = NEAR_BOTTOM_PX) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}

export function useChatScroll(listRef) {
  const pinnedToBottom = ref(true)
  const unseenCount = ref(0)
  const timers = []

  const clearTimers = () => {
    while (timers.length) {
      clearTimeout(timers.pop())
    }
  }

  const scrollNow = () => {
    const el = listRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
    pinnedToBottom.value = true
    unseenCount.value = 0
  }

  const pinToBottom = async () => {
    clearTimers()
    unseenCount.value = 0
    pinnedToBottom.value = true
    await nextTick()
    scrollNow()
    requestAnimationFrame(() => {
      scrollNow()
      requestAnimationFrame(scrollNow)
    })
    timers.push(setTimeout(scrollNow, 80))
    timers.push(setTimeout(scrollNow, 280))
  }

  const onListScroll = () => {
    const el = listRef.value
    if (!el) return
    const near = isNearBottom(el)
    pinnedToBottom.value = near
    if (near) unseenCount.value = 0
  }

  const onContentChange = ({ force = false } = {}) => {
    if (force || pinnedToBottom.value) {
      void pinToBottom()
      return
    }
    unseenCount.value += 1
  }

  const onMediaLoad = (event) => {
    const tag = event.target?.tagName
    if (tag !== 'IMG' && tag !== 'VIDEO') return
    if (pinnedToBottom.value) scrollNow()
  }

  watch(listRef, (el, prev) => {
    prev?.removeEventListener('scroll', onListScroll)
    prev?.removeEventListener('load', onMediaLoad, true)
    el?.addEventListener('scroll', onListScroll, { passive: true })
    el?.addEventListener('load', onMediaLoad, true)
  }, { immediate: true })

  onBeforeUnmount(() => {
    clearTimers()
    listRef.value?.removeEventListener('scroll', onListScroll)
    listRef.value?.removeEventListener('load', onMediaLoad, true)
  })

  return {
    pinnedToBottom,
    unseenCount,
    pinToBottom,
    onContentChange,
  }
}

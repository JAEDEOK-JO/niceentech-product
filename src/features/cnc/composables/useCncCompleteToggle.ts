import { computed } from 'vue'
import type { CncItem } from '../types/cnc'

const LONG_PRESS_MS = 700

export function useCncCompleteToggle(
  item: () => CncItem,
  busy: () => boolean,
  onToggle: (payload: { id: number; isCompleted: boolean }) => void,
) {
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let longPressTriggered = false

  const clearLongPressTimer = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  const statusLabel = computed(() => {
    if (busy()) return '변경 중...'
    return item().isCompleted ? '완료' : '미완료'
  })

  const statusClass = computed(() => (
    item().isCompleted
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-600'
  ))

  const handlePointerDown = () => {
    if (busy() || !item().isCompleted) return

    longPressTriggered = false
    clearLongPressTimer()
    longPressTimer = setTimeout(() => {
      longPressTimer = null
      longPressTriggered = true
      onToggle({ id: item().id, isCompleted: false })
    }, LONG_PRESS_MS)
  }

  const handlePointerUp = () => {
    clearLongPressTimer()
  }

  const handleClick = () => {
    if (longPressTriggered) {
      longPressTriggered = false
      return
    }
    if (busy() || item().isCompleted) return
    onToggle({ id: item().id, isCompleted: true })
  }

  return {
    statusLabel,
    statusClass,
    handlePointerDown,
    handlePointerUp,
    handleClick,
  }
}

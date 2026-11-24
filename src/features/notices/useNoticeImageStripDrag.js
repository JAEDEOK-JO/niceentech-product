import { computed, ref } from 'vue'
import { noticeDragOffset, noticeDragStep } from './noticeImageDrag'

export function useNoticeImageStripDrag(index, count) {
  const dragX = ref(0)
  const dragging = ref(false)
  let startX = 0
  let startY = 0
  let pointerId = null

  const trackStyle = computed(() => ({
    transform: `translateX(calc(${-index.value * 100}% + ${dragX.value}px))`,
    transition: dragging.value ? 'none' : 'transform 180ms ease',
  }))

  function onPointerDown(event) {
    if (event.button !== 0 || count.value < 2) return
    dragging.value = true
    startX = event.clientX
    startY = event.clientY
    pointerId = event.pointerId
    dragX.value = 0
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Pointer capture is unavailable for a synthetic event.
    }
  }

  function onPointerMove(event) {
    if (!dragging.value || event.pointerId !== pointerId) return
    dragX.value = noticeDragOffset(event.clientX - startX, {
      index: index.value,
      count: count.value,
    })
  }

  function finish(event, commit) {
    if (!dragging.value || event.pointerId !== pointerId) return
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    const step =
      commit && Math.abs(dx) > Math.abs(dy)
        ? noticeDragStep(dx, event.currentTarget.clientWidth || 1, {
            index: index.value,
            count: count.value,
          })
        : 0
    dragging.value = false
    pointerId = null
    dragX.value = 0
    if (step) index.value += step
  }

  function onPointerUp(event) {
    finish(event, true)
  }

  function onPointerCancel(event) {
    finish(event, false)
  }

  return { dragging, trackStyle, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { clampNoticeZoom, touchSpan } from './noticeImageZoom'

export function useNoticeImageTouch(targetRef, { onZoomStart } = {}) {
  const scale = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  let mode = ''
  let start = null

  const imageStyle = computed(() => {
    if (scale.value <= 1) return undefined
    return {
      transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
    }
  })

  function reset() {
    scale.value = 1
    panX.value = 0
    panY.value = 0
    mode = ''
    start = null
  }

  function clampPan(element) {
    if (!element || scale.value <= 1) {
      panX.value = 0
      panY.value = 0
      return
    }
    const maxX = (element.clientWidth * (scale.value - 1)) / 2
    const maxY = (element.clientHeight * (scale.value - 1)) / 2
    panX.value = Math.min(maxX, Math.max(-maxX, panX.value))
    panY.value = Math.min(maxY, Math.max(-maxY, panY.value))
  }

  function onTouchStart(event) {
    if (event.target instanceof Element && event.target.closest('button')) return
    if (event.touches.length === 2) {
      onZoomStart?.()
      mode = 'pinch'
      start = {
        distance: touchSpan(event.touches),
        scale: scale.value,
      }
      return
    }
    if (event.touches.length === 1 && scale.value > 1) {
      const touch = event.touches[0]
      mode = 'pan'
      start = { x: touch.clientX, y: touch.clientY, panX: panX.value, panY: panY.value }
    }
  }

  function onTouchMove(event) {
    if (mode === 'pinch' && event.touches.length === 2 && start?.distance > 0) {
      event.preventDefault()
      const distance = touchSpan(event.touches)
      if (distance <= 0) return
      scale.value = clampNoticeZoom(start.scale * (distance / start.distance))
      clampPan(event.currentTarget)
      return
    }
    if (mode === 'pan' && event.touches.length === 1 && scale.value > 1 && start) {
      event.preventDefault()
      const touch = event.touches[0]
      panX.value = start.panX + touch.clientX - start.x
      panY.value = start.panY + touch.clientY - start.y
      clampPan(event.currentTarget)
    }
  }

  function onTouchEnd(event) {
    if (scale.value <= 1) {
      reset()
      return
    }
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      mode = 'pan'
      start = { x: touch.clientX, y: touch.clientY, panX: panX.value, panY: panY.value }
      return
    }
    mode = ''
    start = null
  }

  function bind(element) {
    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('touchend', onTouchEnd)
    element.addEventListener('touchcancel', onTouchEnd)
  }

  function unbind(element) {
    element.removeEventListener('touchstart', onTouchStart)
    element.removeEventListener('touchmove', onTouchMove)
    element.removeEventListener('touchend', onTouchEnd)
    element.removeEventListener('touchcancel', onTouchEnd)
  }

  onMounted(() => {
    if (targetRef.value) bind(targetRef.value)
  })

  onUnmounted(() => {
    if (targetRef.value) unbind(targetRef.value)
  })

  return { scale, imageStyle, reset }
}

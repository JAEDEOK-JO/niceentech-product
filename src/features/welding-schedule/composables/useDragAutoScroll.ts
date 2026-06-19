import { onUnmounted } from 'vue'

type DragAutoScrollOptions = {
  edgeSize?: number
  maxSpeed?: number
}

export const useDragAutoScroll = (options: DragAutoScrollOptions = {}) => {
  const edgeSize = options.edgeSize ?? 80
  const maxSpeed = options.maxSpeed ?? 18
  let isActive = false
  let rafId: number | null = null
  let lastClientY = 0

  const getScrollElement = () => document.scrollingElement || document.documentElement

  const tick = () => {
    if (!isActive) return

    const viewportHeight = window.innerHeight
    let speed = 0

    if (lastClientY < edgeSize) {
      speed = -((edgeSize - lastClientY) / edgeSize) * maxSpeed
    } else if (lastClientY > viewportHeight - edgeSize) {
      speed = ((lastClientY - (viewportHeight - edgeSize)) / edgeSize) * maxSpeed
    }

    if (speed !== 0) {
      getScrollElement().scrollTop += speed
    }

    rafId = window.requestAnimationFrame(tick)
  }

  const handleDragOver = (event: DragEvent) => {
    lastClientY = event.clientY
    event.preventDefault()
  }

  const start = () => {
    if (isActive) return
    isActive = true
    document.addEventListener('dragover', handleDragOver)
    rafId = window.requestAnimationFrame(tick)
  }

  const stop = () => {
    if (!isActive) return
    isActive = false
    document.removeEventListener('dragover', handleDragOver)
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  onUnmounted(stop)

  return { start, stop }
}

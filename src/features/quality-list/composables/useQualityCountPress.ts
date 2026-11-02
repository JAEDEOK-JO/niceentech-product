const LONG_PRESS_MS = 600

export function useQualityCountPress(onLongPress: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let longPressed = false

  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    longPressed = false
    clearTimer()
    const element = event.currentTarget
    if (element instanceof HTMLElement) {
      element.setPointerCapture?.(event.pointerId)
    }
    timer = setTimeout(() => {
      timer = null
      longPressed = true
      onLongPress()
    }, LONG_PRESS_MS)
  }

  const onPointerEnd = () => {
    clearTimer()
  }

  const onClick = (event: MouseEvent, action: () => void) => {
    if (longPressed) {
      longPressed = false
      event.preventDefault()
      event.stopPropagation()
      return
    }
    action()
  }

  const onContextMenu = (event: Event) => {
    event.preventDefault()
  }

  return { onPointerDown, onPointerEnd, onClick, onContextMenu }
}

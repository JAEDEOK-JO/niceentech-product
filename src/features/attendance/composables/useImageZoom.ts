import { computed, ref } from 'vue'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

export function useImageZoom() {
  const zoom = ref(1)
  const offset = ref({ x: 0, y: 0 })
  const dragging = ref(false)
  let dragStart = { x: 0, y: 0 }
  let dragOrigin = { x: 0, y: 0 }

  const percentLabel = computed(() => `${Math.round(zoom.value * 100)}%`)
  const canPan = computed(() => zoom.value > 1)
  const imageStyle = computed(() => ({
    transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${zoom.value})`,
  }))

  const reset = () => {
    zoom.value = 1
    offset.value = { x: 0, y: 0 }
    dragging.value = false
  }

  const addZoom = (delta: number) => {
    const next = Number((zoom.value + delta).toFixed(2))
    zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
    if (zoom.value <= 1) offset.value = { x: 0, y: 0 }
  }

  const zoomIn = () => addZoom(ZOOM_STEP)
  const zoomOut = () => addZoom(-ZOOM_STEP)

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    addZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
  }

  const startDrag = (event: MouseEvent) => {
    if (!canPan.value) return
    dragging.value = true
    dragStart = { x: event.clientX, y: event.clientY }
    dragOrigin = { ...offset.value }
  }

  const moveDrag = (event: MouseEvent) => {
    if (!dragging.value) return
    offset.value = {
      x: dragOrigin.x + (event.clientX - dragStart.x),
      y: dragOrigin.y + (event.clientY - dragStart.y),
    }
  }

  const endDrag = () => {
    dragging.value = false
  }

  return {
    zoom,
    percentLabel,
    canPan,
    dragging,
    imageStyle,
    reset,
    zoomIn,
    zoomOut,
    onWheel,
    startDrag,
    moveDrag,
    endDrag,
  }
}

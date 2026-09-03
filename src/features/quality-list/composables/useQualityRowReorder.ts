import { computed, onBeforeUnmount, ref } from 'vue'
import type { QualityListRow } from '../types/quality'

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 8
const SCROLL_EDGE = 48
const SCROLL_SPEED = 14

function orderChanged(left: QualityListRow[], right: QualityListRow[]) {
  if (left.length !== right.length) return true
  return left.some((item, index) => item.id !== right[index]?.id)
}

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node
    }
    node = node.parentElement
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

function findTargetIndex(listEl: HTMLElement, clientY: number) {
  const rows = [...listEl.querySelectorAll<HTMLElement>('[data-quality-row-id]')]
  if (rows.length === 0) return -1
  for (let index = 0; index < rows.length; index += 1) {
    const rect = rows[index].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return index
  }
  return rows.length - 1
}

export function useQualityRowReorder(options: {
  getItems: () => QualityListRow[]
  enabled: () => boolean
  onReorder: (next: QualityListRow[]) => void
}) {
  const draggingId = ref<number | null>(null)
  const previewItems = ref<QualityListRow[] | null>(null)
  const suppressClick = ref(false)

  let pressTimer: ReturnType<typeof setTimeout> | null = null
  let pointerIsDown = false
  let startX = 0
  let startY = 0
  let lastY = 0
  let listEl: HTMLElement | null = null
  let scrollEl: HTMLElement | null = null
  let rafId: number | null = null
  let dragIndex = -1

  const displayItems = computed(() => previewItems.value ?? options.getItems())
  const isReordering = computed(() => draggingId.value != null)

  function clearPressTimer() {
    if (!pressTimer) return
    clearTimeout(pressTimer)
    pressTimer = null
  }

  function stopAutoScroll() {
    if (rafId == null) return
    window.cancelAnimationFrame(rafId)
    rafId = null
  }

  function tickAutoScroll() {
    if (draggingId.value == null || !scrollEl) return
    const rect = scrollEl.getBoundingClientRect()
    if (lastY < rect.top + SCROLL_EDGE) {
      scrollEl.scrollTop -= SCROLL_SPEED
    } else if (lastY > rect.bottom - SCROLL_EDGE) {
      scrollEl.scrollTop += SCROLL_SPEED
    }
    rafId = window.requestAnimationFrame(tickAutoScroll)
  }

  function resetDrag() {
    clearPressTimer()
    stopAutoScroll()
    pointerIsDown = false
    draggingId.value = null
    previewItems.value = null
    listEl = null
    scrollEl = null
    dragIndex = -1
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('cursor')
  }

  function finishDrag() {
    const next = previewItems.value
    const original = options.getItems()
    const shouldPersist = draggingId.value != null && next != null && orderChanged(original, next)
    resetDrag()
    if (shouldPersist && next) options.onReorder(next)
  }

  function startDrag(itemId: number, handleEl: HTMLElement) {
    if (!pointerIsDown) return
    const items = [...options.getItems()]
    const index = items.findIndex((item) => item.id === itemId)
    if (index < 0) return

    listEl = handleEl.closest<HTMLElement>('[data-quality-reorder-list]')
    if (!listEl) return

    draggingId.value = itemId
    previewItems.value = items
    dragIndex = index
    suppressClick.value = true
    scrollEl = findScrollParent(handleEl)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
    rafId = window.requestAnimationFrame(tickAutoScroll)
  }

  function moveToIndex(nextIndex: number) {
    const current = previewItems.value
    if (!current || dragIndex < 0 || nextIndex < 0 || nextIndex === dragIndex) return
    const next = [...current]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(nextIndex, 0, moved)
    previewItems.value = next
    dragIndex = nextIndex
  }

  function onHandlePointerDown(event: PointerEvent, item: QualityListRow) {
    if (!options.enabled()) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    event.stopPropagation()
    resetDrag()
    pointerIsDown = true
    startX = event.clientX
    startY = event.clientY
    lastY = event.clientY
    const handleEl = event.currentTarget as HTMLElement
    handleEl.setPointerCapture?.(event.pointerId)

    pressTimer = setTimeout(() => {
      pressTimer = null
      startDrag(item.id, handleEl)
    }, LONG_PRESS_MS)
  }

  function onHandlePointerMove(event: PointerEvent) {
    if (!pointerIsDown) return
    lastY = event.clientY

    if (pressTimer) {
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
        clearPressTimer()
      }
      return
    }

    if (draggingId.value == null || !listEl) return
    event.preventDefault()
    moveToIndex(findTargetIndex(listEl, event.clientY))
  }

  function onHandlePointerUp() {
    if (draggingId.value != null) {
      finishDrag()
      return
    }
    resetDrag()
  }

  function consumeClickSuppression() {
    if (!suppressClick.value) return false
    suppressClick.value = false
    return true
  }

  onBeforeUnmount(resetDrag)

  return {
    displayItems,
    draggingId,
    isReordering,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
    consumeClickSuppression,
  }
}

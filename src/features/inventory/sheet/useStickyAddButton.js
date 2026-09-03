import { onBeforeUnmount, onMounted, ref } from 'vue'

const BUTTON_SIZE = 40

export const useStickyAddButton = (sheetRoot) => {
  const addButtonTop = ref('8px')

  const updateAddButtonTop = () => {
    const height = sheetRoot.value?.clientHeight ?? 0
    addButtonTop.value = `${Math.max(Math.round(height / 2 - BUTTON_SIZE / 2), 8)}px`
  }

  let observer

  onMounted(() => {
    updateAddButtonTop()
    if (!sheetRoot.value || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(updateAddButtonTop)
    observer.observe(sheetRoot.value)
  })

  onBeforeUnmount(() => observer?.disconnect())

  return { addButtonTop }
}

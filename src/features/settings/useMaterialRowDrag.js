import { ref } from 'vue'

export const useMaterialRowDrag = () => {
  const draggingId = ref('')
  const overId = ref('')

  const clearDrag = () => {
    draggingId.value = ''
    overId.value = ''
  }

  const onDragStart = (item, event) => {
    draggingId.value = String(item.id)
    overId.value = String(item.id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(item.id))
  }

  const onDragOver = (item, event) => {
    if (!draggingId.value) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    overId.value = String(item.id)
  }

  const takeDrop = (item) => {
    const fromId = draggingId.value
    const toId = String(item?.id ?? '')
    clearDrag()
    if (!fromId || !toId || fromId === toId) return null
    return { fromId, toId }
  }

  return {
    draggingId,
    overId,
    onDragStart,
    onDragOver,
    takeDrop,
    onDragEnd: clearDrag,
  }
}

export const moveOrderedIds = (ids, fromId, toId) => {
  const nextIds = ids.map((id) => String(id))
  const fromIndex = nextIds.indexOf(String(fromId))
  const toIndex = nextIds.indexOf(String(toId))
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return nextIds
  const [moved] = nextIds.splice(fromIndex, 1)
  nextIds.splice(toIndex, 0, moved)
  return nextIds
}

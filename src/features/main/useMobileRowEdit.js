import { ref } from 'vue'

export const useMobileRowEdit = () => {
  const editingRowId = ref(null)

  const isRowEditing = (row) => editingRowId.value === row?.id

  const startEdit = (row) => {
    editingRowId.value = row?.id ?? null
  }

  const finishEdit = () => {
    editingRowId.value = null
  }

  const toggleEdit = (row) => {
    if (isRowEditing(row)) {
      finishEdit()
      return
    }
    startEdit(row)
  }

  return {
    editingRowId,
    isRowEditing,
    startEdit,
    finishEdit,
    toggleEdit,
  }
}

import { statusClass } from '@/features/main/mainProductionPlanConfig'
import { deriveInventoryWorkStatus } from './deriveInventoryWorkStatus'

const WORK_STATUSES = ['출하완료', '작업완료', '작업중']

export const parseInventoryWorkMemo = (memo) => {
  const text = String(memo ?? '').trim()
  for (const status of WORK_STATUSES) {
    if (text === status) return { label: '', status }
    if (text.endsWith(status)) {
      const label = text.slice(0, -status.length).trim()
      return { label, status }
    }
  }
  return { label: text, status: '' }
}

export const resolveInventoryWorkMemoStatus = (memo) => parseInventoryWorkMemo(memo).status

export const isWorkingInventoryMemo = (memo) => resolveInventoryWorkMemoStatus(memo) === '작업중'

export const displayInventoryWorkMemo = (memo) => parseInventoryWorkMemo(memo).label

export const composeInventoryWorkMemo = (label, status) => {
  const nextLabel = String(label ?? '').trim()
  const nextStatus = String(status ?? '').trim()
  if (!nextStatus) return nextLabel
  if (!nextLabel) return nextStatus
  return `${nextLabel} ${nextStatus}`
}

export const replaceInventoryWorkMemoLabel = (memo, nextLabel) => {
  const typed = parseInventoryWorkMemo(nextLabel)
  if (typed.status) return composeInventoryWorkMemo(typed.label, typed.status)
  return composeInventoryWorkMemo(nextLabel, parseInventoryWorkMemo(memo).status)
}

export const inventoryWorkMemoToneClass = (memo) => {
  const status = resolveInventoryWorkMemoStatus(memo)
  return status ? statusClass(status) : ''
}

export const buildInventoryWorkLabel = (row) =>
  String(row?.area ?? '').trim() || String(row?.initial ?? '').trim() || '-'

export const buildInventoryWorkMemo = (row) => {
  const label = buildInventoryWorkLabel(row)
  const status = deriveInventoryWorkStatus(row)
  return composeInventoryWorkMemo(label, status)
}

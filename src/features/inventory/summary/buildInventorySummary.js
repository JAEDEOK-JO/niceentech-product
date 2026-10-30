import { columnHasQuantity } from '@/features/inventory/sheet/mapTransactionsToSheet'
import { displayColumnDate, formatYyMmDd } from '@/features/inventory/sheet/sheetDate'
import { buildSummaries } from '@/features/inventory/sheet/sheetFormat'
import {
  displayInventoryWorkMemo,
  resolveInventoryWorkMemoStatus,
} from '@/features/inventory/work-status'

export const formatSummaryPlanDate = (value) => {
  const text = String(value ?? '').trim()
  const korean = text.match(/^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/)
  if (korean) return formatYyMmDd(korean[1], korean[2], korean[3])
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return formatYyMmDd(iso[1], iso[2], iso[3])
  return text
}

const quantityNumber = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(number) ? number : 0
}

export const buildShortageRowsFromQuantities = (materials, quantityRows) => {
  const totals = new Map()
  for (const row of quantityRows ?? []) {
    const quantity = quantityNumber(row.quantity)
    if (quantity === 0) continue
    const id = String(row.material_item_id)
    const current = totals.get(id) ?? { inbound: 0, outbound: 0 }
    if (quantity > 0) current.inbound += quantity
    else current.outbound += quantity
    totals.set(id, current)
  }

  return (materials ?? []).flatMap((material) => {
    const summary = totals.get(String(material.id)) ?? { inbound: 0, outbound: 0 }
    if (summary.inbound === 0 && summary.outbound === 0) return []
    const balance = summary.inbound - Math.abs(summary.outbound)
    if (balance >= 0) return []
    const label = [material.group, material.spec].map((value) => String(value ?? '').trim()).filter(Boolean).join(' ')
    return [{
      id: String(material.id),
      label,
      inbound: summary.inbound,
      outbound: summary.outbound,
      balance,
    }]
  })
}

export const buildShortageRows = (materials, inboundColumns, outboundColumns) => {
  const summaries = buildSummaries(materials, inboundColumns, outboundColumns)
  return (materials ?? []).flatMap((material) => {
    const summary = summaries[material.id]
    const balance = Number(summary?.inboundNet)
    if (!Number.isFinite(balance) || balance >= 0) return []
    const label = [material.group, material.spec].map((value) => String(value ?? '').trim()).filter(Boolean).join(' ')
    return [{
      id: String(material.id),
      label,
      inbound: summary.inbound,
      outbound: summary.outbound,
      balance,
    }]
  })
}

const inspectionDateForColumn = (column, plans) => {
  const productListId = Number(column?.productListId)
  if (productListId) {
    const linked = (plans ?? []).find((plan) => Number(plan.id) === productListId)
    if (linked?.inspectionDate) return linked.inspectionDate
  }
  const area = displayInventoryWorkMemo(column?.memo)
  const matched = (plans ?? []).find((plan) => plan.area && plan.area === area)
  return matched?.inspectionDate ?? ''
}

export const buildWorkingZoneRows = (columns, plans = []) =>
  (columns ?? [])
    .filter((column) => resolveInventoryWorkMemoStatus(column.memo) === '작업중' && columnHasQuantity(column))
    .map((column) => ({
      id: column.localId,
      inspectionDate: inspectionDateForColumn(column, plans),
      date: displayColumnDate(column),
      area: displayInventoryWorkMemo(column.memo),
    }))

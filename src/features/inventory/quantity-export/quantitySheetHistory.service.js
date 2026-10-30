import { supabase } from '@/lib/supabase'
import { formatQuantitySheetCreatedAt } from './quantitySheetSnapshot.js'

const SHEET_TABLE = 'inventory_quantity_sheets'
const COLUMN_TABLE = 'inventory_quantity_sheet_columns'
const ITEM_TABLE = 'inventory_quantity_sheet_items'

const throwHistoryError = (error) => {
  throw new Error(error?.message || '산출서 내역을 처리하지 못했습니다.')
}

const mapHistoryRow = (row) => ({
  id: row.id,
  siteName: row.site_name ?? '',
  createdAt: row.created_at,
  createdDate: formatQuantitySheetCreatedAt(row.created_at),
  columns: [...(row.inventory_quantity_sheet_columns ?? [])]
    .sort((left, right) => Number(left.sort_order) - Number(right.sort_order))
    .map((column) => ({
      sortOrder: column.sort_order,
      columnDate: column.column_date ?? '',
      memo: column.memo ?? '',
      items: (column.inventory_quantity_sheet_items ?? []).map((item) => ({
        materialGroup: item.material_group ?? '',
        spec: item.spec ?? '',
        quantity: Number(item.quantity),
      })),
    })),
})

export async function fetchQuantitySheetHistory(companyId, materialType) {
  const { data, error } = await supabase
    .from(SHEET_TABLE)
    .select(`
      id,
      site_name,
      created_at,
      inventory_quantity_sheet_columns (
        sort_order,
        column_date,
        memo,
        inventory_quantity_sheet_items (
          material_group,
          spec,
          quantity
        )
      )
    `)
    .eq('company_id', Number(companyId))
    .eq('material_type', materialType)
    .order('created_at', { ascending: false })

  if (error) throwHistoryError(error)
  return (data ?? []).map(mapHistoryRow)
}

export async function saveQuantitySheetHistory({ companyId, materialType, siteName, columns }) {
  if (!columns?.length) throw new Error('저장할 산출 내역이 없습니다.')
  const sheetResult = await supabase
    .from(SHEET_TABLE)
    .insert({
      company_id: Number(companyId),
      material_type: materialType,
      site_name: String(siteName ?? '').trim(),
    })
    .select('id, created_at')
    .single()

  if (sheetResult.error) throwHistoryError(sheetResult.error)
  const sheetId = sheetResult.data.id

  try {
    const columnResult = await supabase
      .from(COLUMN_TABLE)
      .insert((columns ?? []).map((column) => ({
        sheet_id: sheetId,
        sort_order: column.sortOrder,
        column_date: column.columnDate ?? '',
        memo: column.memo ?? '',
      })))
      .select('id, sort_order')

    if (columnResult.error) throwHistoryError(columnResult.error)

    const columnIds = new Map((columnResult.data ?? []).map((column) => [Number(column.sort_order), column.id]))
    const items = (columns ?? []).flatMap((column) => {
      const columnId = columnIds.get(Number(column.sortOrder))
      if (!columnId) return []
      return (column.items ?? []).map((item) => ({
        column_id: columnId,
        material_group: item.materialGroup,
        spec: item.spec,
        quantity: item.quantity,
      }))
    })

    if (items.length > 0) {
      const itemResult = await supabase.from(ITEM_TABLE).insert(items)
      if (itemResult.error) throwHistoryError(itemResult.error)
    }
  } catch (error) {
    await supabase.from(SHEET_TABLE).delete().eq('id', sheetId)
    throw error
  }

  return sheetResult.data
}

export async function deleteQuantitySheetHistory(sheetId) {
  const { error } = await supabase.from(SHEET_TABLE).delete().eq('id', sheetId)
  if (error) throwHistoryError(error)
}

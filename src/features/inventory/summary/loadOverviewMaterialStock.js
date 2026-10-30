import { materialsFromItems } from '@/features/inventory/sheet/mapTransactionsToSheet'
import {
  RAW_MATERIAL_TYPE,
  SUBSIDIARY_MATERIAL_TYPE,
  buildInventoryStockRows,
  fetchInventoryQuantityRows,
  fetchInventoryQuantityRowsByItems,
  fetchInventoryStockSummary,
} from '@/features/inventory/services/inventory.service'
import { buildShortageRowsFromQuantities } from '@/features/inventory/summary/buildInventorySummary'

export async function loadOverviewMaterialStock(materialItems, materialType) {
  const items = materialItems ?? []
  if (materialType === SUBSIDIARY_MATERIAL_TYPE) {
    const quantityRows = await fetchInventoryQuantityRowsByItems(items.map((item) => item.id))
    return {
      stockRows: buildInventoryStockRows(items, quantityRows),
      shortageRows: buildShortageRowsFromQuantities(materialsFromItems(items), quantityRows),
    }
  }

  const [stockRows, quantityRows] = await Promise.all([
    fetchInventoryStockSummary(items, null, RAW_MATERIAL_TYPE),
    fetchInventoryQuantityRows(),
  ])

  return {
    stockRows,
    shortageRows: buildShortageRowsFromQuantities(materialsFromItems(items), quantityRows),
  }
}

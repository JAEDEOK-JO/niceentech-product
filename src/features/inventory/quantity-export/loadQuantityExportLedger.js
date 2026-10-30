import {
  fetchInventoryCompanyMaterialItems,
  fetchRecentInventoryTransactions,
} from '@/features/inventory/services/inventory.service'
import { materialsFromItems, splitTransactionsToColumns } from '@/features/inventory/sheet/mapTransactionsToSheet'

export async function loadQuantityExportLedger(companyId, materialType) {
  const materialItems = await fetchInventoryCompanyMaterialItems(companyId, materialType)
  const transactions = await fetchRecentInventoryTransactions(300, companyId, materialType)
  const { outboundColumns } = splitTransactionsToColumns(transactions, materialItems)
  return {
    materials: materialsFromItems(materialItems),
    columns: outboundColumns,
  }
}

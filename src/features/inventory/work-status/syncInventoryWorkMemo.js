import { fetchInventoryCompanyList, updateInventoryMemosForPlan } from '@/features/inventory/services/inventory.service'
import { matchInventoryCompany } from '@/features/inventory/matchInventoryCompany'
import { buildInventoryWorkMemo } from './buildInventoryWorkMemo'
import { collectPlanMemoLabels } from './planOutboundMatch'

export async function syncInventoryWorkMemo(row, updates = {}) {
  if (!row?.id) return
  const nextRow = { ...row, ...updates }
  const companies = await fetchInventoryCompanyList()
  const company = matchInventoryCompany(companies, nextRow)
  await updateInventoryMemosForPlan({
    productListId: nextRow.id,
    companyId: company?.id,
    companyName: nextRow.company,
    placeName: nextRow.place,
    planRow: nextRow,
    memoLabels: collectPlanMemoLabels(nextRow),
    memo: buildInventoryWorkMemo(nextRow),
  })
}

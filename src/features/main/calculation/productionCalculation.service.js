import {
  RAW_MATERIAL_TYPE,
  SUBSIDIARY_MATERIAL_TYPE,
  deleteInventoryTransaction,
  fetchInventoryCompanyMaterialItems,
  fetchInventoryEntryData,
  fetchPlanOutboundQuantities,
  upsertProductOutboundSheetRow,
} from '@/features/inventory/services/inventory.service'
import { todayIso } from '@/features/inventory/sheet/sheetDate'
import { buildInventoryWorkLabel, buildInventoryWorkMemo } from '@/features/inventory/work-status'

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeText = (value) => String(value ?? '').trim().toLowerCase()

export const filterCalculationCompanies = (companies, keyword) => {
  const query = normalizeText(keyword)
  const source = companies ?? []
  if (!query) return []
  return source
    .filter((company) =>
      `${company.company ?? ''} ${company.place ?? ''} ${company.initial ?? ''}`
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 8)
}

export { matchInventoryCompany as matchCompanyFromPlanRow } from '@/features/inventory/matchInventoryCompany'

export const compactQuantities = (quantities) => {
  const next = {}
  for (const [materialId, value] of Object.entries(quantities ?? {})) {
    const number = toNumber(value)
    if (number === 0) continue
    next[String(materialId)] = String(-Math.abs(number))
  }
  return next
}

export const hasCalculationQuantity = (...quantityMaps) =>
  quantityMaps.some((quantities) => Object.keys(compactQuantities(quantities)).length > 0)

export const formatCalculationCompany = (company) =>
  [company?.company, company?.place].filter(Boolean).join(' ')

export async function loadCalculationCompanies() {
  const entryData = await fetchInventoryEntryData(RAW_MATERIAL_TYPE)
  return entryData.companies ?? []
}

export async function loadCalculationMaterials(companyId) {
  if (!companyId) return { rawItems: [], subsidiaryItems: [] }
  const [rawItems, subsidiaryItems] = await Promise.all([
    fetchInventoryCompanyMaterialItems(companyId, RAW_MATERIAL_TYPE),
    fetchInventoryCompanyMaterialItems(companyId, SUBSIDIARY_MATERIAL_TYPE),
  ])
  return { rawItems, subsidiaryItems }
}

const buildSaveRow = (planRow, quantities) => ({
  transactionDate: todayIso(),
  memo: buildInventoryWorkMemo(planRow),
  manufacturer: '',
  supplier: '',
  quantities,
  productListId: planRow?.id ?? null,
})

const upsertType = async ({ company, planRow, materialItems, materialType, quantities }) => {
  const compact = compactQuantities(quantities)
  if (Object.keys(compact).length === 0) {
    await deleteCalculationOutboundType({ company, planRow, materialType })
    return
  }
  await upsertProductOutboundSheetRow({
    company,
    materialItems,
    materialType,
    productListId: planRow?.id,
    planRow,
    memoLabel: buildInventoryWorkLabel(planRow),
    row: buildSaveRow(planRow, compact),
  })
}

export async function loadCalculationOutbound({ company, planRow }) {
  const params = {
    productListId: planRow?.id,
    companyId: company?.id,
    companyName: company?.company,
    placeName: company?.place,
    planRow,
    memoLabel: buildInventoryWorkLabel(planRow),
  }
  const [raw, subsidiary] = await Promise.all([
    fetchPlanOutboundQuantities({ ...params, materialType: RAW_MATERIAL_TYPE }),
    fetchPlanOutboundQuantities({ ...params, materialType: SUBSIDIARY_MATERIAL_TYPE }),
  ])
  return {
    rawQuantities: raw.quantities,
    subsidiaryQuantities: subsidiary.quantities,
    rawTransactionId: raw.transactionId,
    subsidiaryTransactionId: subsidiary.transactionId,
  }
}

export async function deleteCalculationOutboundType({ company, planRow, materialType }) {
  const existing = await fetchPlanOutboundQuantities({
    productListId: planRow?.id,
    companyId: company?.id,
    materialType,
    planRow,
    memoLabel: buildInventoryWorkLabel(planRow),
  })
  if (!existing.transactionId) return false
  await deleteInventoryTransaction(existing.transactionId)
  return true
}

export async function saveCalculationOutbound({
  company,
  planRow,
  rawItems,
  subsidiaryItems,
  rawQuantities,
  subsidiaryQuantities,
}) {
  if (!company?.id) throw new Error('현장을 선택해주세요.')

  await upsertType({
    company,
    planRow,
    materialItems: rawItems,
    materialType: RAW_MATERIAL_TYPE,
    quantities: rawQuantities,
  })
  await upsertType({
    company,
    planRow,
    materialItems: subsidiaryItems,
    materialType: SUBSIDIARY_MATERIAL_TYPE,
    quantities: subsidiaryQuantities,
  })

  return {
    hasQuantity: hasCalculationQuantity(rawQuantities, subsidiaryQuantities),
  }
}

import { supabase } from '@/lib/supabase'

const MATERIAL_TABLE = 'inventory_material_items'
const TRANSACTION_TABLE = 'inventory_transactions'
const TRANSACTION_ITEM_TABLE = 'inventory_transaction_items'

export const INVENTORY_AUTH_REQUIRED = 'INVENTORY_AUTH_REQUIRED'
const authRequiredMessage = '로그인 세션이 만료되었습니다. 다시 로그인한 뒤 저장해주세요.'

export const transactionTypeOptions = [
  { value: 'incoming', label: '입고' },
  { value: 'return', label: '반출' },
  { value: 'use', label: '사용' },
  { value: 'adjustment', label: '조정' },
]

export const defaultPipeItems = [
  ...['25', '32', '40', '50', '65', '80', '100', '125', '150', '200'].map((spec, index) => ({
    id: `default-normal-${spec}`,
    category: 'pipe',
    material_group: '일반강관',
    name: '일반강관',
    spec,
    unit: '본',
    sort_order: 100 + index * 10,
    isDefaultOnly: true,
  })),
  ...['100', '125', '150'].map((spec, index) => ({
    id: `default-schedule-${spec}`,
    category: 'pipe',
    material_group: '스케쥴',
    name: '스케쥴',
    spec,
    unit: '본',
    sort_order: 300 + index * 10,
    isDefaultOnly: true,
  })),
]

const tableMissingMessage = (tableName) =>
  `${tableName} 테이블이 아직 없습니다. supabase/migrations/20260520054050_inventory_transactions_entry.sql을 원격 DB에 적용해야 저장할 수 있습니다.`

const isMissingTableError = (error) => {
  const message = String(error?.message ?? '')
  return message.includes('Could not find the table') || message.includes('schema cache')
}

const isAuthError = (error) => {
  const status = Number(error?.status ?? error?.code ?? 0)
  const message = String(error?.message ?? '').toLowerCase()
  return status === 401 || status === 403 || message.includes('jwt') || message.includes('token') || message.includes('unauthorized')
}

const createAuthError = () => {
  const error = new Error(authRequiredMessage)
  error.code = INVENTORY_AUTH_REQUIRED
  return error
}

const sessionRefreshMarginSeconds = 300

const clearStoredAuth = async () => {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    if (typeof window !== 'undefined') window.localStorage.removeItem('niceentech-auth')
  }
}

const requireAuthenticatedSession = async () => {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData?.session) throw createAuthError()

  const expiresAt = Number(sessionData.session.expires_at ?? 0)
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (!expiresAt || expiresAt - nowSeconds > sessionRefreshMarginSeconds) {
    return sessionData.session
  }

  const refreshResult = await supabase.auth.refreshSession()
  if (refreshResult.error || !refreshResult.data?.session) {
    await clearStoredAuth()
    throw createAuthError()
  }

  return refreshResult.data.session
}

const requireAuthenticatedUserId = async () => {
  const session = await requireAuthenticatedSession()
  if (!session.user?.id) throw createAuthError()
  return session.user.id
}

const throwInventoryError = (error) => {
  if (isAuthError(error)) throw createAuthError()
  throw error
}

const toNumber = (value) => {
  const normalized = String(value ?? '').replace(/,/g, '').trim()
  if (!normalized) return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

const inferTransactionTypeFromQuantities = (quantities) => {
  const values = quantities.map(toNumber).filter((quantity) => quantity !== 0)
  if (values.some((quantity) => quantity < 0) && values.some((quantity) => quantity > 0)) return 'adjustment'
  if (values.some((quantity) => quantity < 0)) return 'return'
  return 'incoming'
}

const inferTransactionType = (row) => {
  const quantities = Object.values(row?.quantities ?? {})
  return inferTransactionTypeFromQuantities(quantities)
}

export const formatMaterialLabel = (item) =>
  [item?.name, item?.spec].filter(Boolean).join(' ')

const buildStockSummary = (materialItems, quantityRows) => {
  const totals = new Map()
  for (const row of quantityRows ?? []) {
    const materialId = String(row.material_item_id)
    const current = totals.get(materialId) ?? 0
    totals.set(materialId, current + toNumber(row.quantity))
  }

  return materialItems.map((item) => ({
    id: item.id,
    material: item,
    label: formatMaterialLabel(item),
    quantity: totals.get(String(item.id)) ?? 0,
    unit: item.unit || '',
  }))
}

const buildStockTotals = (materialItems, quantityRows) => {
  const totals = new Map()
  for (const row of quantityRows ?? []) {
    const materialId = String(row.material_item_id)
    const quantity = toNumber(row.quantity)
    const current = totals.get(materialId) ?? { incomingQuantity: 0, outgoingQuantity: 0 }
    if (quantity > 0) current.incomingQuantity += quantity
    if (quantity < 0) current.outgoingQuantity += quantity
    totals.set(materialId, current)
  }

  return materialItems.map((item) => {
    const itemTotals = totals.get(String(item.id)) ?? { incomingQuantity: 0, outgoingQuantity: 0 }
    return {
      id: item.id,
      material: item,
      label: formatMaterialLabel(item),
      incomingQuantity: itemTotals.incomingQuantity,
      outgoingQuantity: itemTotals.outgoingQuantity,
      quantity: itemTotals.incomingQuantity + itemTotals.outgoingQuantity,
      unit: item.unit || '',
    }
  })
}

export async function fetchInventoryEntryData() {
  const [companiesResult, materialsResult] = await Promise.all([
    supabase
      .from('company_list')
      .select('id,company,place,initial')
      .order('company', { ascending: true })
      .order('place', { ascending: true }),
    supabase
      .from(MATERIAL_TABLE)
      .select('id,category,material_group,name,spec,unit,sort_order,is_active')
      .eq('is_active', true)
      .eq('category', 'pipe')
      .order('sort_order', { ascending: true }),
  ])

  if (companiesResult.error) throw companiesResult.error

  if (materialsResult.error) {
    if (isMissingTableError(materialsResult.error)) {
      return {
        companies: companiesResult.data ?? [],
        materialItems: defaultPipeItems,
        setupWarning: tableMissingMessage(MATERIAL_TABLE),
      }
    }
    throw materialsResult.error
  }

  return {
    companies: companiesResult.data ?? [],
    materialItems: materialsResult.data ?? [],
    setupWarning: '',
  }
}

export async function fetchInventoryStockSummary(materialItems, companyId = null) {
  if (!Array.isArray(materialItems) || materialItems.length === 0) return []

  let transactionIds = null

  if (companyId) {
    const transactionsResult = await supabase
      .from(TRANSACTION_TABLE)
      .select('id')
      .eq('company_id', Number(companyId))

    if (transactionsResult.error) {
      if (isMissingTableError(transactionsResult.error)) return buildStockSummary(materialItems, [])
      throw transactionsResult.error
    }

    transactionIds = (transactionsResult.data ?? []).map((row) => row.id)
    if (transactionIds.length === 0) return buildStockSummary(materialItems, [])
  }

  let query = supabase
    .from(TRANSACTION_ITEM_TABLE)
    .select('material_item_id,quantity,transaction_id')

  if (transactionIds) query = query.in('transaction_id', transactionIds)

  const itemsResult = await query

  if (itemsResult.error) {
    if (isMissingTableError(itemsResult.error)) return buildStockSummary(materialItems, [])
    throw itemsResult.error
  }

  return buildStockSummary(materialItems, itemsResult.data ?? [])
}

export async function fetchInventoryStockTotals(materialItems, companyId = null) {
  if (!Array.isArray(materialItems) || materialItems.length === 0) return []

  let transactionIds = null

  if (companyId) {
    const transactionsResult = await supabase
      .from(TRANSACTION_TABLE)
      .select('id')
      .eq('company_id', Number(companyId))

    if (transactionsResult.error) {
      if (isMissingTableError(transactionsResult.error)) return buildStockTotals(materialItems, [])
      throw transactionsResult.error
    }

    transactionIds = (transactionsResult.data ?? []).map((row) => row.id)
    if (transactionIds.length === 0) return buildStockTotals(materialItems, [])
  }

  let query = supabase
    .from(TRANSACTION_ITEM_TABLE)
    .select('material_item_id,quantity,transaction_id')

  if (transactionIds) query = query.in('transaction_id', transactionIds)

  const itemsResult = await query

  if (itemsResult.error) {
    if (isMissingTableError(itemsResult.error)) return buildStockTotals(materialItems, [])
    throw itemsResult.error
  }

  return buildStockTotals(materialItems, itemsResult.data ?? [])
}

export async function fetchRecentInventoryTransactions(limit = 20, companyId = null) {
  let query = supabase
    .from(TRANSACTION_TABLE)
    .select('id,transaction_date,transaction_type,company_name,place_name,memo,manufacturer,supplier,created_at')
    .order('transaction_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (companyId) query = query.eq('company_id', Number(companyId))

  const transactionsResult = await query

  if (transactionsResult.error) {
    if (isMissingTableError(transactionsResult.error)) return []
    throw transactionsResult.error
  }

  const transactions = transactionsResult.data ?? []
  const ids = transactions.map((row) => row.id)
  if (ids.length === 0) return []

  const itemsResult = await supabase
    .from(TRANSACTION_ITEM_TABLE)
    .select('transaction_id,material_item_id,quantity,inventory_material_items(name,spec,unit,material_group)')
    .in('transaction_id', ids)

  if (itemsResult.error) {
    if (isMissingTableError(itemsResult.error)) return transactions.map((row) => ({ ...row, items: [] }))
    throw itemsResult.error
  }

  const itemsByTransaction = new Map()
  for (const item of itemsResult.data ?? []) {
    const list = itemsByTransaction.get(item.transaction_id) ?? []
    list.push(item)
    itemsByTransaction.set(item.transaction_id, list)
  }

  return transactions.map((row) => ({
    ...row,
    items: itemsByTransaction.get(row.id) ?? [],
  }))
}

export function summarizeSheetRows(rows) {
  return rows.filter((row) => {
    const hasMemo = String(row.memo ?? '').trim()
    const hasQuantity = Object.values(row.quantities ?? {}).some((value) => toNumber(value) !== 0)
    return hasMemo || hasQuantity
  })
}

export async function saveInventorySheetRows(rows, materialItems, company) {
  const targetRows = summarizeSheetRows(rows)
  if (targetRows.length === 0) throw new Error('저장할 입출고 내역이 없습니다.')
  if (!company?.id) throw new Error('현장을 먼저 선택해주세요.')

  const createdBy = await requireAuthenticatedUserId()
  const materialMap = new Map(materialItems.map((item) => [String(item.id), item]))
  const savedIds = []

  for (let index = 0; index < targetRows.length; index += 1) {
    const row = targetRows[index]
    const rowNumber = index + 1

    const items = Object.entries(row.quantities ?? {})
      .map(([materialId, value]) => {
        const material = materialMap.get(String(materialId))
        return {
          material,
          materialId,
          quantity: toNumber(value),
        }
      })
      .filter((item) => item.material && item.quantity !== 0)

    if (items.length === 0) throw new Error(`${rowNumber}번째 행에 수량을 입력해주세요.`)
    if (items.some((item) => String(item.materialId).startsWith('default-'))) {
      throw new Error('DB 테이블이 아직 적용되지 않아 저장할 수 없습니다. migration 적용 후 다시 시도해주세요.')
    }

    const transactionPayload = {
      transaction_date: row.transactionDate,
      transaction_type: inferTransactionType(row),
      company_id: Number(company.id),
      company_name: String(company.company ?? '').trim(),
      place_name: String(company.place ?? '').trim(),
      memo: String(row.memo ?? '').trim(),
      manufacturer: String(row.manufacturer ?? '').trim(),
      supplier: String(row.supplier ?? '').trim(),
      created_by: createdBy,
    }

    const transactionResult = await supabase
      .from(TRANSACTION_TABLE)
      .insert(transactionPayload)
      .select('id')
      .single()

    if (transactionResult.error) throwInventoryError(transactionResult.error)
    const transactionId = transactionResult.data.id
    savedIds.push(transactionId)

    const itemPayload = items.map((item) => ({
      transaction_id: transactionId,
      material_item_id: Number(item.materialId),
      quantity: item.quantity,
    }))

    const itemsResult = await supabase.from(TRANSACTION_ITEM_TABLE).insert(itemPayload)
    if (itemsResult.error) {
      await supabase.from(TRANSACTION_TABLE).delete().eq('id', transactionId)
      throwInventoryError(itemsResult.error)
    }
  }

  return savedIds
}

export async function updateInventoryTransactionHeader(transactionId, field, value) {
  await requireAuthenticatedSession()

  const allowedFields = new Set(['transaction_date', 'transaction_type', 'memo', 'manufacturer', 'supplier'])
  if (!allowedFields.has(field)) throw new Error('수정할 수 없는 항목입니다.')

  const payload = { [field]: String(value ?? '').trim(), updated_at: new Date().toISOString() }
  const result = await supabase
    .from(TRANSACTION_TABLE)
    .update(payload)
    .eq('id', Number(transactionId))

  if (result.error) throwInventoryError(result.error)
}

export async function updateInventoryTransactionItemQuantity(transactionId, materialId, quantity, transactionType = null) {
  await requireAuthenticatedSession()

  const normalizedQuantity = toNumber(quantity)
  const transactionIdNumber = Number(transactionId)
  const materialIdNumber = Number(materialId)
  const nextTransactionType = transactionTypeOptions.some((option) => option.value === transactionType)
    ? transactionType
    : null
  const headerUpdate = nextTransactionType
    ? {
        transaction_type: nextTransactionType,
        updated_at: new Date().toISOString(),
      }
    : {
        updated_at: new Date().toISOString(),
      }

  const deleteResult = await supabase
    .from(TRANSACTION_ITEM_TABLE)
    .delete()
    .eq('transaction_id', transactionIdNumber)
    .eq('material_item_id', materialIdNumber)

  if (deleteResult.error) throwInventoryError(deleteResult.error)

  if (!normalizedQuantity) {
    const headerResult = await supabase
      .from(TRANSACTION_TABLE)
      .update(headerUpdate)
      .eq('id', transactionIdNumber)

    if (headerResult.error) throwInventoryError(headerResult.error)
    return nextTransactionType
  }

  const [insertResult, headerResult] = await Promise.all([
    supabase
      .from(TRANSACTION_ITEM_TABLE)
      .insert({
        transaction_id: transactionIdNumber,
        material_item_id: materialIdNumber,
        quantity: normalizedQuantity,
      }),
    supabase
      .from(TRANSACTION_TABLE)
      .update(headerUpdate)
      .eq('id', transactionIdNumber),
  ])

  if (insertResult.error) throwInventoryError(insertResult.error)
  if (headerResult.error) throwInventoryError(headerResult.error)
  return nextTransactionType
}

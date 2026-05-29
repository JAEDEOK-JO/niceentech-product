import { supabase } from '@/lib/supabase'

const MATERIAL_TABLE = 'inventory_material_items'
const COMPANY_MATERIAL_TABLE = 'inventory_company_material_items'
const TRANSACTION_TABLE = 'inventory_transactions'
const TRANSACTION_ITEM_TABLE = 'inventory_transaction_items'
export const RAW_MATERIAL_TYPE = 'raw'
export const SUBSIDIARY_MATERIAL_TYPE = 'subsidiary'
const rawMaterialGroupSortOrder = new Map([
  ['일반강관', 1],
  ['스케쥴', 2],
  ['수파이프', 3],
  ['써스', 4],
])

export const INVENTORY_AUTH_REQUIRED = 'INVENTORY_AUTH_REQUIRED'
const authRequiredMessage = '로그인 세션이 만료되었습니다. 다시 로그인한 뒤 저장해주세요.'

export const transactionTypeOptions = [
  { value: 'incoming', label: '입고' },
  { value: 'return', label: '반출' },
  { value: 'use', label: '사용' },
  { value: 'adjustment', label: '조정' },
]

const createDefaultMaterialItem = ({ category, materialType, group, spec, unit, sortOrder, isDefault = true }) => ({
  id: `default-${materialType}-${group}-${spec}`,
  category,
  material_type: materialType,
  material_group: group,
  name: group,
  spec,
  unit,
  sort_order: sortOrder,
  is_active: true,
  is_default: isDefault,
  isDefaultOnly: true,
})

export const defaultRawMaterialItems = [
  ...['25A', '32A', '40A', '50A', '65A', '80A', '100A', '125A', '150A'].map((spec, index) =>
    createDefaultMaterialItem({
      category: 'pipe',
      materialType: RAW_MATERIAL_TYPE,
      group: '일반강관',
      spec,
      unit: '본',
      sortOrder: 10 + index * 10,
    }),
  ),
  ...['100A', '125A', '150A'].map((spec, index) =>
    createDefaultMaterialItem({
      category: 'pipe',
      materialType: RAW_MATERIAL_TYPE,
      group: '스케쥴',
      spec,
      unit: '본',
      sortOrder: 100 + index * 10,
    }),
  ),
  ...['15S', '20S', '25S', '40S', '50S', '60S', '80S', '100S', '125S', '150S'].map((spec, index) =>
    createDefaultMaterialItem({
      category: 'pipe',
      materialType: RAW_MATERIAL_TYPE,
      group: '수파이프',
      spec,
      unit: '본',
      sortOrder: 200 + index * 10,
      isDefault: false,
    }),
  ),
  ...['15S', '20S', '25S', '40S', '50S', '60S', '80S', '100S', '125S', '150S'].map((spec, index) =>
    createDefaultMaterialItem({
      category: 'pipe',
      materialType: RAW_MATERIAL_TYPE,
      group: '써스',
      spec,
      unit: '본',
      sortOrder: 300 + index * 10,
      isDefault: false,
    }),
  ),
]

const subsidiaryDefaultGroups = [
  ['EL (나사)', ['25A', '32A', '40A', '40A*20A', '40A*25A']],
  ['EL (용접)', ['25A', '32A', '40A', '50A', '65A', '80A', '100A', '125A', '150A']],
  ['EL (용접) 45도', ['25A', '32A', '40A', '50A', '65A', '80A', '150A']],
  ['EL (나사) 45도', ['25A']],
  ['TEE (나사)', ['25A', '32A*25A', '32A', '40A*25A', '40A*32A', '40A', '50A*25A', '50A*40A', '50A']],
  ['TEE (용접)', ['80A', '100A', '125A', '150A']],
  ['레듀샤 (나사)', ['32A*25A', '40A*25A', '40A*32A', '50A*25A', '50A*32A', '50A*40A']],
  ['레듀샤 (용접)', ['100A*25A', '100A*32A', '100A*40A', '125A*80A', '150A*100A']],
  ['주물소켓', ['25A', '32A', '40A', '50A']],
  ['철소켓', ['25A']],
  ['장니쁠', ['20A', '25A', '32A', '40A', '50A']],
  ['편니쁠', ['15A*42L', '25A*42L', '40A*135L', '40A*200L', '50A*135L', '65A*200L']],
  ['후렌지 (용접)', ['50A', '65A', '80A', '100A', '150A']],
  ['CAP (나사)', ['25A', '32A', '40A', '50A']],
  ['CAP (용접)', ['25A', '32A', '40A', '80A', '100A', '125A']],
]

export const defaultSubsidiaryMaterialItems = subsidiaryDefaultGroups.flatMap(([group, specs], groupIndex) =>
  specs.map((spec, specIndex) =>
    createDefaultMaterialItem({
      category: 'fitting',
      materialType: SUBSIDIARY_MATERIAL_TYPE,
      group,
      spec,
      unit: 'EA',
      sortOrder: 1000 + groupIndex * 100 + specIndex * 10,
      isDefault: false,
    }),
  ),
)

export const defaultPipeItems = defaultRawMaterialItems

const defaultMaterialItemsByType = {
  [RAW_MATERIAL_TYPE]: defaultRawMaterialItems,
  [SUBSIDIARY_MATERIAL_TYPE]: defaultSubsidiaryMaterialItems,
}

export const normalizeMaterialType = (materialType = RAW_MATERIAL_TYPE) =>
  materialType === SUBSIDIARY_MATERIAL_TYPE ? SUBSIDIARY_MATERIAL_TYPE : RAW_MATERIAL_TYPE

const tableMissingMessage = (tableName) =>
  `${tableName} 테이블이 아직 없습니다. supabase/migrations/20260520054050_inventory_transactions_entry.sql을 원격 DB에 적용해야 저장할 수 있습니다.`

const companyMaterialSetupMessage =
  '회사별 원자재/부자재 설정 마이그레이션을 원격 DB에 적용하면 현장별 품목 설정을 사용할 수 있습니다.'

const isMissingTableError = (error) => {
  const message = String(error?.message ?? '')
  return message.includes('Could not find the table') || message.includes('schema cache')
}

const isMissingInventoryMaterialTypeSchema = (error) => {
  const message = String(error?.message ?? '').toLowerCase()
  return (
    isMissingTableError(error) ||
    message.includes('material_type') ||
    message.includes('inventory_company_material_items')
  )
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

const getSpecSortNumber = (spec) => {
  const matched = String(spec ?? '').match(/\d+(?:\.\d+)?/)
  if (!matched) return Number.MAX_SAFE_INTEGER
  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

const compareRawMaterialItems = (left, right) => {
  const leftGroupOrder = rawMaterialGroupSortOrder.get(String(left.material_group ?? '')) ?? 99
  const rightGroupOrder = rawMaterialGroupSortOrder.get(String(right.material_group ?? '')) ?? 99
  if (leftGroupOrder !== rightGroupOrder) return leftGroupOrder - rightGroupOrder

  const leftSpecNumber = getSpecSortNumber(left.spec)
  const rightSpecNumber = getSpecSortNumber(right.spec)
  if (leftSpecNumber !== rightSpecNumber) return leftSpecNumber - rightSpecNumber

  const groupCompare = String(left.material_group ?? '').localeCompare(String(right.material_group ?? ''), 'ko')
  if (groupCompare !== 0) return groupCompare
  return String(left.spec ?? '').localeCompare(String(right.spec ?? ''), 'ko', { numeric: true })
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

const materialSelectColumns =
  'id,category,material_type,material_group,name,spec,unit,sort_order,is_active,is_default'

const buildMaterialOrderQuery = (query) =>
  query
    .order('material_type', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('material_group', { ascending: true })
    .order('spec', { ascending: true })

const getFallbackMaterialItems = (materialType) =>
  defaultMaterialItemsByType[normalizeMaterialType(materialType)] ?? defaultRawMaterialItems

const fetchLegacyPipeMaterials = async () => {
  const result = await supabase
    .from(MATERIAL_TABLE)
    .select('id,category,material_group,name,spec,unit,sort_order,is_active')
    .eq('is_active', true)
    .eq('category', 'pipe')
    .order('sort_order', { ascending: true })

  if (result.error) throw result.error
  return (result.data ?? []).map((item) => ({
    ...item,
    material_type: RAW_MATERIAL_TYPE,
    is_default: true,
  }))
}

const fetchDefaultMaterialItems = async (materialType) => {
  const normalizedType = normalizeMaterialType(materialType)
  const result = await supabase
    .from(MATERIAL_TABLE)
    .select(materialSelectColumns)
    .eq('is_active', true)
    .eq('is_default', true)
    .eq('material_type', normalizedType)
    .order('sort_order', { ascending: true })

  if (result.error) {
    if (normalizedType === RAW_MATERIAL_TYPE && isMissingInventoryMaterialTypeSchema(result.error)) {
      try {
        return await fetchLegacyPipeMaterials()
      } catch (legacyError) {
        if (isMissingTableError(legacyError)) return defaultRawMaterialItems
        throw legacyError
      }
    }
    if (normalizedType === SUBSIDIARY_MATERIAL_TYPE && isMissingInventoryMaterialTypeSchema(result.error)) {
      return defaultSubsidiaryMaterialItems
    }
    throw result.error
  }

  return result.data ?? []
}

export async function fetchInventoryCompanyMaterialItems(companyId, materialType = RAW_MATERIAL_TYPE) {
  const normalizedType = normalizeMaterialType(materialType)
  if (!companyId) return fetchDefaultMaterialItems(normalizedType)

  const companyItemsResult = await supabase
    .from(COMPANY_MATERIAL_TABLE)
    .select('material_item_id,sort_order,is_active,inventory_material_items(id,category,material_type,material_group,name,spec,unit,is_active,is_default)')
    .eq('company_id', Number(companyId))
    .eq('material_type', normalizedType)
    .order('sort_order', { ascending: true })

  if (companyItemsResult.error) {
    if (isMissingInventoryMaterialTypeSchema(companyItemsResult.error)) return fetchDefaultMaterialItems(normalizedType)
    throw companyItemsResult.error
  }

  const companyItemRows = companyItemsResult.data ?? []
  const linkedItems = companyItemRows
    .filter((row) => row.is_active !== false)
    .map((row) => ({
      ...(row.inventory_material_items ?? {}),
      sort_order: row.sort_order,
    }))
    .filter((item) => item.id && item.is_active !== false)

  if (linkedItems.length > 0) return linkedItems
  if (companyItemRows.length > 0) return []

  const defaultItems = await fetchDefaultMaterialItems(normalizedType)
  if (defaultItems.length === 0 || defaultItems.some((item) => item.isDefaultOnly)) return defaultItems

  const linkPayload = defaultItems.map((item) => ({
    company_id: Number(companyId),
    material_item_id: Number(item.id),
    material_type: normalizedType,
    sort_order: Number(item.sort_order ?? 0),
    is_active: true,
  }))

  const insertResult = await supabase
    .from(COMPANY_MATERIAL_TABLE)
    .insert(linkPayload)
    .select('material_item_id,sort_order,inventory_material_items(id,category,material_type,material_group,name,spec,unit,is_active,is_default)')
    .order('sort_order', { ascending: true })

  if (insertResult.error) {
    if (isMissingInventoryMaterialTypeSchema(insertResult.error)) return defaultItems
    const retryResult = await supabase
      .from(COMPANY_MATERIAL_TABLE)
      .select('material_item_id,sort_order,inventory_material_items(id,category,material_type,material_group,name,spec,unit,is_active,is_default)')
      .eq('company_id', Number(companyId))
      .eq('material_type', normalizedType)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (retryResult.error) throw insertResult.error
    const retryItems = (retryResult.data ?? [])
      .map((row) => ({
        ...(row.inventory_material_items ?? {}),
        sort_order: row.sort_order,
      }))
      .filter((item) => item.id && item.is_active !== false)

    return retryItems.length > 0 ? retryItems : defaultItems
  }

  return (insertResult.data ?? [])
    .map((row) => ({
      ...(row.inventory_material_items ?? {}),
      sort_order: row.sort_order,
    }))
    .filter((item) => item.id && item.is_active !== false)
}

export async function fetchInventoryMaterialCatalog(materialType = null, includeInactive = false) {
  const normalizedType = materialType ? normalizeMaterialType(materialType) : null
  let query = supabase
    .from(MATERIAL_TABLE)
    .select(materialSelectColumns)

  if (normalizedType) query = query.eq('material_type', normalizedType)
  if (!includeInactive) query = query.eq('is_active', true)

  const result = await buildMaterialOrderQuery(query)
  if (result.error) {
    if (isMissingInventoryMaterialTypeSchema(result.error)) return normalizedType ? getFallbackMaterialItems(normalizedType) : defaultRawMaterialItems
    throw result.error
  }
  return result.data ?? []
}

const getNextMaterialSortOrder = async (materialType, materialGroup = '') => {
  const normalizedType = normalizeMaterialType(materialType)
  const group = String(materialGroup ?? '').trim()
  let query = supabase
    .from(MATERIAL_TABLE)
    .select('sort_order')
    .eq('material_type', normalizedType)
    .order('sort_order', { ascending: false })
    .limit(1)

  if (group) query = query.eq('material_group', group)

  let result = await query

  if (result.error) {
    if (isMissingInventoryMaterialTypeSchema(result.error)) return normalizedType === RAW_MATERIAL_TYPE ? 400 : 2000
    throw result.error
  }

  if (group && (result.data ?? []).length === 0) {
    result = await supabase
      .from(MATERIAL_TABLE)
      .select('sort_order')
      .eq('material_type', normalizedType)
      .order('sort_order', { ascending: false })
      .limit(1)

    if (result.error) {
      if (isMissingInventoryMaterialTypeSchema(result.error)) return normalizedType === RAW_MATERIAL_TYPE ? 400 : 2000
      throw result.error
    }
  }

  const maxOrder = Number(result.data?.[0]?.sort_order ?? (normalizedType === RAW_MATERIAL_TYPE ? 390 : 1990))
  return maxOrder + 10
}

const rebalanceRawMaterialSortOrders = async () => {
  const result = await supabase
    .from(MATERIAL_TABLE)
    .select('id,material_group,spec,sort_order')
    .eq('material_type', RAW_MATERIAL_TYPE)
    .eq('is_active', true)

  if (result.error) throwInventoryError(result.error)

  const sortedItems = [...(result.data ?? [])].sort(compareRawMaterialItems)
  for (let index = 0; index < sortedItems.length; index += 1) {
    const item = sortedItems[index]
    const sortOrder = (index + 1) * 10
    if (Number(item.sort_order ?? 0) === sortOrder) continue

    const updateItemResult = await supabase
      .from(MATERIAL_TABLE)
      .update({
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', Number(item.id))

    if (updateItemResult.error) throwInventoryError(updateItemResult.error)

    const updateCompanyItemResult = await supabase
      .from(COMPANY_MATERIAL_TABLE)
      .update({
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('material_item_id', Number(item.id))

    if (updateCompanyItemResult.error) throwInventoryError(updateCompanyItemResult.error)
  }
}

const fetchInventoryMaterialCatalogItem = async (materialId) => {
  const result = await supabase
    .from(MATERIAL_TABLE)
    .select(materialSelectColumns)
    .eq('id', Number(materialId))
    .single()

  if (result.error) throwInventoryError(result.error)
  return result.data
}

export async function createInventoryMaterialCatalogItem(payload) {
  await requireAuthenticatedSession()

  const materialType = normalizeMaterialType(payload?.material_type)
  const group = String(payload?.material_group ?? '').trim()
  const spec = String(payload?.spec ?? '').trim()
  const unit = String(payload?.unit ?? (materialType === RAW_MATERIAL_TYPE ? '본' : 'EA')).trim()
  if (!group) throw new Error('품목 그룹명을 입력해주세요.')
  if (!spec) throw new Error('규격을 입력해주세요.')

  const duplicateResult = await supabase
    .from(MATERIAL_TABLE)
    .select('id,is_active')
    .eq('material_type', materialType)
    .eq('material_group', group)
    .eq('spec', spec)
    .limit(1)

  if (duplicateResult.error) throwInventoryError(duplicateResult.error)
  if ((duplicateResult.data ?? []).length > 0) throw new Error('이미 등록된 품목입니다.')

  const sortOrder = await getNextMaterialSortOrder(materialType, group)
  const result = await supabase
    .from(MATERIAL_TABLE)
    .insert({
      category: materialType === RAW_MATERIAL_TYPE ? 'pipe' : 'fitting',
      material_type: materialType,
      material_group: group,
      name: group,
      spec,
      unit: unit || (materialType === RAW_MATERIAL_TYPE ? '본' : 'EA'),
      sort_order: sortOrder,
      is_active: true,
      is_default: false,
    })
    .select(materialSelectColumns)
    .single()

  if (result.error) throwInventoryError(result.error)
  if (materialType === RAW_MATERIAL_TYPE) {
    await rebalanceRawMaterialSortOrders()
    return fetchInventoryMaterialCatalogItem(result.data.id)
  }
  return result.data
}

export async function updateInventoryMaterialCatalogItem(materialId, payload) {
  await requireAuthenticatedSession()

  const targetId = Number(materialId)
  const group = String(payload?.material_group ?? '').trim()
  const spec = String(payload?.spec ?? '').trim()
  const unit = String(payload?.unit ?? '').trim()
  const isDefault = Boolean(payload?.is_default)
  const isActive = Boolean(payload?.is_active)
  if (!group) throw new Error('품목 그룹명을 입력해주세요.')
  if (!spec) throw new Error('규격을 입력해주세요.')

  const currentResult = await supabase
    .from(MATERIAL_TABLE)
    .select('material_type')
    .eq('id', targetId)
    .single()

  if (currentResult.error) throwInventoryError(currentResult.error)

  const duplicateResult = await supabase
    .from(MATERIAL_TABLE)
    .select('id')
    .eq('material_type', normalizeMaterialType(currentResult.data?.material_type))
    .eq('material_group', group)
    .eq('spec', spec)
    .neq('id', targetId)
    .limit(1)

  if (duplicateResult.error) throwInventoryError(duplicateResult.error)
  if ((duplicateResult.data ?? []).length > 0) throw new Error('이미 등록된 품목입니다.')

  const result = await supabase
    .from(MATERIAL_TABLE)
    .update({
      material_group: group,
      name: group,
      spec,
      unit,
      is_default: isDefault,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .select(materialSelectColumns)
    .single()

  if (result.error) throwInventoryError(result.error)
  if (normalizeMaterialType(currentResult.data?.material_type) === RAW_MATERIAL_TYPE) {
    await rebalanceRawMaterialSortOrders()
    return fetchInventoryMaterialCatalogItem(targetId)
  }
  return result.data
}

export async function setInventoryMaterialCatalogItemActive(materialId, isActive) {
  await requireAuthenticatedSession()

  const result = await supabase
    .from(MATERIAL_TABLE)
    .update({
      is_active: Boolean(isActive),
      updated_at: new Date().toISOString(),
    })
    .eq('id', Number(materialId))

  if (result.error) throwInventoryError(result.error)
}

export async function deleteInventoryMaterialCatalogItem(materialId) {
  await requireAuthenticatedSession()

  const targetId = Number(materialId)
  if (!targetId) throw new Error('삭제할 품목을 선택해주세요.')

  const materialResult = await supabase
    .from(MATERIAL_TABLE)
    .select('material_type')
    .eq('id', targetId)
    .single()

  if (materialResult.error) throwInventoryError(materialResult.error)

  const itemRowsResult = await supabase
    .from(TRANSACTION_ITEM_TABLE)
    .select('transaction_id')
    .eq('material_item_id', targetId)

  if (itemRowsResult.error) throwInventoryError(itemRowsResult.error)
  const affectedTransactionIds = [...new Set((itemRowsResult.data ?? []).map((row) => row.transaction_id).filter(Boolean))]

  const deleteItemsResult = await supabase
    .from(TRANSACTION_ITEM_TABLE)
    .delete()
    .eq('material_item_id', targetId)

  if (deleteItemsResult.error) throwInventoryError(deleteItemsResult.error)

  const deleteCompanyLinksResult = await supabase
    .from(COMPANY_MATERIAL_TABLE)
    .delete()
    .eq('material_item_id', targetId)

  if (deleteCompanyLinksResult.error) throwInventoryError(deleteCompanyLinksResult.error)

  const deleteCatalogResult = await supabase
    .from(MATERIAL_TABLE)
    .delete()
    .eq('id', targetId)

  if (deleteCatalogResult.error) throwInventoryError(deleteCatalogResult.error)

  for (const transactionId of affectedTransactionIds) {
    const remainingItemsResult = await supabase
      .from(TRANSACTION_ITEM_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', transactionId)

    if (remainingItemsResult.error) throwInventoryError(remainingItemsResult.error)
    if (Number(remainingItemsResult.count ?? 0) > 0) continue

    const deleteEmptyTransactionResult = await supabase
      .from(TRANSACTION_TABLE)
      .delete()
      .eq('id', transactionId)

    if (deleteEmptyTransactionResult.error) throwInventoryError(deleteEmptyTransactionResult.error)
  }

  if (normalizeMaterialType(materialResult.data?.material_type) === RAW_MATERIAL_TYPE) {
    await rebalanceRawMaterialSortOrders()
  }
}

export async function fetchAvailableCompanyMaterialItems(companyId, materialType = RAW_MATERIAL_TYPE) {
  const normalizedType = normalizeMaterialType(materialType)
  if (!companyId) return fetchInventoryMaterialCatalog(normalizedType)

  const [catalog, linkedResult] = await Promise.all([
    fetchInventoryMaterialCatalog(normalizedType),
    supabase
      .from(COMPANY_MATERIAL_TABLE)
      .select('material_item_id,is_active')
      .eq('company_id', Number(companyId))
      .eq('material_type', normalizedType)
      .eq('is_active', true),
  ])

  if (linkedResult.error) {
    if (isMissingInventoryMaterialTypeSchema(linkedResult.error)) return catalog
    throw linkedResult.error
  }

  const linkedIds = new Set((linkedResult.data ?? []).map((row) => String(row.material_item_id)))
  return catalog.map((item) => ({
    ...item,
    isLinkedToCompany: linkedIds.has(String(item.id)),
  }))
}

export async function addCompanyInventoryMaterialItem(companyId, materialItemId, materialType = RAW_MATERIAL_TYPE) {
  await requireAuthenticatedSession()

  const normalizedType = normalizeMaterialType(materialType)
  if (!companyId) throw new Error('현장을 먼저 선택해주세요.')
  if (!materialItemId) throw new Error('추가할 품목을 선택해주세요.')

  const materialResult = await supabase
    .from(MATERIAL_TABLE)
    .select('id,material_type,sort_order')
    .eq('id', Number(materialItemId))
    .single()

  if (materialResult.error) throwInventoryError(materialResult.error)

  const result = await supabase
    .from(COMPANY_MATERIAL_TABLE)
    .upsert(
      {
        company_id: Number(companyId),
        material_item_id: Number(materialItemId),
        material_type: normalizedType,
        sort_order: Number(materialResult.data?.sort_order ?? 0),
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,material_item_id' },
    )

  if (result.error) throwInventoryError(result.error)
}

export async function removeCompanyInventoryMaterialItem(companyId, materialItemId, materialType = RAW_MATERIAL_TYPE) {
  await requireAuthenticatedSession()

  const normalizedType = normalizeMaterialType(materialType)
  if (!companyId) throw new Error('현장을 먼저 선택해주세요.')
  if (!materialItemId) throw new Error('제외할 품목을 선택해주세요.')

  const result = await supabase
    .from(COMPANY_MATERIAL_TABLE)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', Number(companyId))
    .eq('material_item_id', Number(materialItemId))
    .eq('material_type', normalizedType)

  if (result.error) throwInventoryError(result.error)
}

export async function fetchInventoryEntryData(materialType = RAW_MATERIAL_TYPE) {
  const normalizedType = normalizeMaterialType(materialType)
  const [companiesResult, materialsResult] = await Promise.all([
    supabase
      .from('company_list')
      .select('id,company,place,initial')
      .order('company', { ascending: true })
      .order('place', { ascending: true }),
    fetchDefaultMaterialItems(normalizedType),
  ])

  if (companiesResult.error) throw companiesResult.error

  if (materialsResult instanceof Error) throw materialsResult

  const materialItems = Array.isArray(materialsResult) && materialsResult.length > 0
    ? materialsResult
    : getFallbackMaterialItems(normalizedType)
  const setupWarning = materialItems.some((item) => item.isDefaultOnly)
    ? tableMissingMessage(MATERIAL_TABLE)
    : ''

  if (normalizedType === SUBSIDIARY_MATERIAL_TYPE && materialItems.some((item) => item.isDefaultOnly)) {
    return {
      companies: companiesResult.data ?? [],
      materialItems,
      setupWarning: companyMaterialSetupMessage,
    }
  }

  return {
    companies: companiesResult.data ?? [],
    materialItems,
    setupWarning,
  }
}

const fetchTransactionIds = async (companyId, materialType) => {
  const normalizedType = normalizeMaterialType(materialType)
  let query = supabase
    .from(TRANSACTION_TABLE)
    .select('id')

  if (companyId) query = query.eq('company_id', Number(companyId))
  query = query.eq('material_type', normalizedType)

  const result = await query
  if (!result.error) return (result.data ?? []).map((row) => row.id)

  if (normalizedType === RAW_MATERIAL_TYPE && isMissingInventoryMaterialTypeSchema(result.error)) {
    let fallbackQuery = supabase
      .from(TRANSACTION_TABLE)
      .select('id')

    if (companyId) fallbackQuery = fallbackQuery.eq('company_id', Number(companyId))

    const fallbackResult = await fallbackQuery
    if (fallbackResult.error) {
      if (isMissingTableError(fallbackResult.error)) return []
      throw fallbackResult.error
    }
    return (fallbackResult.data ?? []).map((row) => row.id)
  }

  if (normalizedType === SUBSIDIARY_MATERIAL_TYPE && isMissingInventoryMaterialTypeSchema(result.error)) return []
  throw result.error
}

export async function fetchInventoryStockSummary(materialItems, companyId = null, materialType = RAW_MATERIAL_TYPE) {
  if (!Array.isArray(materialItems) || materialItems.length === 0) return []

  let transactionIds = null

  if (companyId || materialType !== RAW_MATERIAL_TYPE) {
    transactionIds = await fetchTransactionIds(companyId, materialType)
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

export async function fetchInventoryStockTotals(materialItems, companyId = null, materialType = RAW_MATERIAL_TYPE) {
  if (!Array.isArray(materialItems) || materialItems.length === 0) return []

  let transactionIds = null

  if (companyId || materialType !== RAW_MATERIAL_TYPE) {
    transactionIds = await fetchTransactionIds(companyId, materialType)
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

export async function fetchRecentInventoryTransactions(limit = 20, companyId = null, materialType = RAW_MATERIAL_TYPE) {
  const normalizedType = normalizeMaterialType(materialType)
  let query = supabase
    .from(TRANSACTION_TABLE)
    .select('id,transaction_date,transaction_type,material_type,company_name,place_name,memo,manufacturer,supplier,created_at')
    .order('transaction_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (companyId) query = query.eq('company_id', Number(companyId))
  query = query.eq('material_type', normalizedType)

  let transactionsResult = await query

  if (transactionsResult.error) {
    if (normalizedType === RAW_MATERIAL_TYPE && isMissingInventoryMaterialTypeSchema(transactionsResult.error)) {
      let fallbackQuery = supabase
        .from(TRANSACTION_TABLE)
        .select('id,transaction_date,transaction_type,company_name,place_name,memo,manufacturer,supplier,created_at')
        .order('transaction_date', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit)

      if (companyId) fallbackQuery = fallbackQuery.eq('company_id', Number(companyId))
      transactionsResult = await fallbackQuery
    }

    if (transactionsResult.error) {
      if (isMissingTableError(transactionsResult.error)) return []
      if (normalizedType === SUBSIDIARY_MATERIAL_TYPE && isMissingInventoryMaterialTypeSchema(transactionsResult.error)) return []
      throw transactionsResult.error
    }
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

export async function saveInventorySheetRows(rows, materialItems, company, materialType = RAW_MATERIAL_TYPE) {
  const targetRows = summarizeSheetRows(rows)
  if (targetRows.length === 0) throw new Error('저장할 입출고 내역이 없습니다.')
  if (!company?.id) throw new Error('현장을 먼저 선택해주세요.')

  const normalizedType = normalizeMaterialType(materialType)
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
      material_type: normalizedType,
      company_id: Number(company.id),
      company_name: String(company.company ?? '').trim(),
      place_name: String(company.place ?? '').trim(),
      memo: String(row.memo ?? '').trim(),
      manufacturer: String(row.manufacturer ?? '').trim(),
      supplier: String(row.supplier ?? '').trim(),
      created_by: createdBy,
    }

    let transactionResult = await supabase
      .from(TRANSACTION_TABLE)
      .insert(transactionPayload)
      .select('id')
      .single()

    if (transactionResult.error && normalizedType === RAW_MATERIAL_TYPE && isMissingInventoryMaterialTypeSchema(transactionResult.error)) {
      const { material_type: _materialType, ...legacyPayload } = transactionPayload
      transactionResult = await supabase
        .from(TRANSACTION_TABLE)
        .insert(legacyPayload)
        .select('id')
        .single()
    }

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

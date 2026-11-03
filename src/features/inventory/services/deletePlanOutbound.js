import { supabase } from '@/lib/supabase'
import { memoMatchesPlanLabels, resolvePlanMemoLabels } from '@/features/inventory/work-status/planOutboundMatch'
import { fetchInventoryCompanyList } from '@/features/inventory/services/inventory.service'

const TRANSACTION_TABLE = 'inventory_transactions'
const OUTBOUND_TYPES = ['return', 'use']
const PAGE_SIZE = 1000

const isMissingProductListId = (error) =>
  String(error?.message ?? '').toLowerCase().includes('product_list_id')

const requireSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data?.session) {
    throw new Error('로그인 세션이 만료되었습니다. 다시 로그인한 뒤 저장해주세요.')
  }
}

const idsByProductList = async (productListId) => {
  const result = await supabase
    .from(TRANSACTION_TABLE)
    .select('id')
    .eq('product_list_id', Number(productListId))

  if (result.error) {
    if (isMissingProductListId(result.error)) return []
    throw new Error(result.error.message)
  }

  return (result.data ?? []).map((row) => row.id)
}

const loadOutboundRows = async (company) => {
  const rows = []
  let includeProductLink = true

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from(TRANSACTION_TABLE)
      .select(includeProductLink ? 'id,memo,product_list_id,company_name,place_name' : 'id,memo,company_name,place_name')
      .in('transaction_type', OUTBOUND_TYPES)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (company?.id) query = query.eq('company_id', Number(company.id))
    else {
      const companyName = String(company?.company ?? '').trim()
      const placeName = String(company?.place ?? '').trim()
      if (companyName) query = query.eq('company_name', companyName)
      if (placeName) query = query.eq('place_name', placeName)
    }

    const result = await query
    if (result.error && includeProductLink && isMissingProductListId(result.error)) {
      includeProductLink = false
      from -= PAGE_SIZE
      continue
    }
    if (result.error) throw new Error(result.error.message)

    const batch = result.data ?? []
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }

  return rows
}

const exactCompany = (companies, planRow) => {
  const companyName = String(planRow?.company ?? '').trim()
  const placeName = String(planRow?.place ?? '').trim()
  return (
    (companies ?? []).find(
      (item) => String(item.company ?? '').trim() === companyName && String(item.place ?? '').trim() === placeName,
    ) ?? null
  )
}

export async function deletePlanOutboundTransactions(planRow) {
  if (!planRow?.id) return []

  await requireSession()

  const companies = await fetchInventoryCompanyList()
  const company = exactCompany(companies, planRow)
  const labels = resolvePlanMemoLabels({ planRow, includeInitialOnly: false })
  const ids = new Set(await idsByProductList(planRow.id))
  const companyName = String(company?.company ?? planRow.company ?? '').trim()
  const placeName = String(company?.place ?? planRow.place ?? '').trim()

  const rows = companyName || placeName
    ? await loadOutboundRows(company ?? { company: companyName, place: placeName })
    : []

  for (const row of rows) {
    const linked = Number(row.product_list_id) === Number(planRow.id)
    if (linked || memoMatchesPlanLabels(row.memo, labels)) ids.add(row.id)
  }

  const idList = [...ids]
  if (idList.length === 0) return []

  const result = await supabase.from(TRANSACTION_TABLE).delete().in('id', idList)
  if (result.error) throw new Error(result.error.message)
  return idList
}

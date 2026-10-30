import { supabase } from '@/lib/supabase'
import { formatSummaryPlanDate } from '@/features/inventory/summary/buildInventorySummary'
import { planPieceCounts } from '@/features/inventory/summary/planPieceCounts'

const PLAN_COLUMNS = 'id,company,place,area,test_date,calculation,head,hole,groove,worker_t,worker_nasa,worker_main,worker_welding'
const PLAN_COLUMNS_WITHOUT_WORKERS = 'id,company,place,area,test_date,calculation,head,hole,groove'
const PLAN_COLUMNS_WITHOUT_COUNTS = 'id,company,place,area,test_date,calculation'

const siteText = (row) =>
  [row?.company, row?.place].map((value) => String(value ?? '').trim()).filter(Boolean).join(' ')

const toPlanRow = (row) => ({
  id: row.id,
  company: String(row.company ?? '').trim(),
  place: String(row.place ?? '').trim(),
  site: siteText(row),
  area: String(row.area ?? '').trim(),
  inspectionDate: formatSummaryPlanDate(row.test_date),
  calculation: Boolean(row.calculation),
  worker_t: row.worker_t ?? '',
  worker_nasa: row.worker_nasa ?? '',
  worker_main: row.worker_main ?? '',
  worker_welding: row.worker_welding ?? '',
  ...planPieceCounts(row),
})

const isMissingWorkerColumn = (error) => /worker_t|worker_nasa|worker_main|worker_welding/i.test(String(error?.message ?? ''))

const isMissingPieceCountColumn = (error) => /head|hole|groove/i.test(String(error?.message ?? ''))

export async function fetchSitePlans(company) {
  const companyName = String(company?.company ?? '').trim()
  const placeName = String(company?.place ?? '').trim()
  if (!companyName || !placeName) return []

  const loadPlans = (columns) =>
    supabase.from('product_list').select(columns).eq('company', companyName).eq('place', placeName)

  let { data, error } = await loadPlans(PLAN_COLUMNS)

  if (error && isMissingWorkerColumn(error)) {
    const fallback = await loadPlans(PLAN_COLUMNS_WITHOUT_WORKERS)
    data = fallback.data
    error = fallback.error
  }

  if (error && isMissingPieceCountColumn(error)) {
    const fallback = await loadPlans(PLAN_COLUMNS_WITHOUT_COUNTS)
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (String(error.message ?? '').includes('calculation')) return []
    throw error
  }

  return (data ?? []).map(toPlanRow)
}

const PAGE_SIZE = 1000

const loadPlanPages = async (columns) => {
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('product_list')
      .select(columns)
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { data: rows, error }
    rows.push(...(data ?? []))
    if ((data ?? []).length < PAGE_SIZE) return { data: rows, error: null }
    from += PAGE_SIZE
  }
}

export async function fetchOverviewPlans() {
  let { data, error } = await loadPlanPages(PLAN_COLUMNS)

  if (error && isMissingWorkerColumn(error)) {
    const fallback = await loadPlanPages(PLAN_COLUMNS_WITHOUT_WORKERS)
    data = fallback.data
    error = fallback.error
  }

  if (error && isMissingPieceCountColumn(error)) {
    const fallback = await loadPlanPages(PLAN_COLUMNS_WITHOUT_COUNTS)
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    if (String(error.message ?? '').includes('calculation')) return []
    throw error
  }

  return (data ?? []).map(toPlanRow)
}


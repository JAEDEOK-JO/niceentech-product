import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  createEmptyQualityForm,
  mapQualityListRow,
  type CompanyRecord,
  type QualityCountBreakdown,
  type QualityFormState,
  type QualityListFilters,
  type QualityListRow,
  type QualityLotInfo,
} from '../types/quality'

const LOT_META: Record<
  string,
  { lotKsd: string; lotCertification: string; lotKsdNum: string }
> = {
  백관: { lotKsd: 'KSD 3507', lotCertification: '분기 25-36', lotKsdNum: '' },
  스케쥴: { lotKsd: 'KSD 3562', lotCertification: '분기 12-9', lotKsdNum: 'sch40' },
  서스: { lotKsd: 'KSD 3576', lotCertification: '분기 11-39', lotKsdNum: '' },
  수파이프: { lotKsd: 'KSD 3595', lotCertification: '분기 23-2', lotKsdNum: '' },
}

const MAIN_FIELDS = ['a32', 'a40', 'a50', 'a65'] as const
const ALL_COUNT_FIELDS = [
  'a32',
  'a40',
  'a50',
  'a65',
  'm65',
  'm80',
  'm100',
  'm125',
  'm150',
  'm200',
] as const

export type QualityCountField = (typeof ALL_COUNT_FIELDS)[number]

export interface CalculationBundle {
  companies: CompanyRecord[]
  pipeTypes: Array<Record<string, unknown>>
  fittingTypes: Array<Record<string, unknown>>
  pipeTransactions: Array<Record<string, unknown>>
  fittingTransactions: Array<Record<string, unknown>>
}

function buildSearchTokens(input: string): string[] {
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function totalFromForm(form: QualityFormState): number {
  return ALL_COUNT_FIELDS.reduce((sum, key) => sum + Number(form[key] ?? 0), 0)
}

function buildFullText(form: QualityFormState): string {
  return `${form.company} ${form.place} ${form.area} ${form.initial} ${form.lotNameH ?? ''} ${form.lotNumH ?? ''}`
    .trim()
    .replace(/\s+/g, ' ')
}

async function fetchNextSortValue(testDate: string): Promise<number> {
  const latestSort = await supabase
    .from('quality_list')
    .select('sort')
    .eq('test_date', testDate)
    .not('sort', 'is', null)
    .order('sort', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestSort.data?.sort != null) {
    return Number(latestSort.data.sort) + 1
  }

  const fallback = await supabase.from('quality_list').select('id').eq('test_date', testDate)
  return fallback.data?.length ?? 0
}

async function fetchCompanyId(company: string, place: string): Promise<number | null> {
  const response = await supabase
    .from('company_list')
    .select('id')
    .eq('company', company)
    .eq('place', place)
    .maybeSingle()

  return response.data?.id ? Number(response.data.id) : null
}

export async function fetchQualityList(filters: QualityListFilters): Promise<QualityListRow[]> {
  let query = supabase.from('quality_list').select(`
      *,
      company_list!company_id(company, place)
    `)

  if (!filters.showAllRecords) {
    query = query.eq('test_date', filters.testDate)
  }

  const tokens = buildSearchTokens(filters.searchQuery)
  for (const token of tokens) {
    query = query.ilike('full_text', `%${token}%`)
  }

  query = query.order('sort', { ascending: true })
  if (filters.showAllRecords) {
    query = query.order('test_date', { ascending: false })
  }

  const response = await query
  if (response.error) throw response.error

  return (response.data ?? []).map((row) => mapQualityListRow(row as Record<string, unknown>))
}

export async function fetchQualityItem(id: number): Promise<QualityListRow | null> {
  const response = await supabase
    .from('quality_list')
    .select(`
      *,
      company_list!company_id(company, place)
    `)
    .eq('id', id)
    .maybeSingle()

  if (response.error) throw response.error
  return response.data ? mapQualityListRow(response.data as Record<string, unknown>) : null
}

export interface QualityRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

export function subscribeQualityList(
  onChange: (payload: QualityRealtimePayload) => void,
): RealtimeChannel {
  return supabase
    .channel(`quality-list-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quality_list' },
      (payload) => onChange({
        eventType: payload.eventType as QualityRealtimePayload['eventType'],
        new: (payload.new as Record<string, unknown>) ?? null,
        old: (payload.old as Record<string, unknown>) ?? null,
      }),
    )
    .subscribe()
}

export async function removeSubscription(channel: RealtimeChannel) {
  await supabase.removeChannel(channel)
}

export async function deleteQualityItem(id: number) {
  const response = await supabase.from('quality_list').delete().eq('id', id)
  if (response.error) throw response.error
}

export async function updateQualityItem(id: number, payload: Record<string, unknown>) {
  const response = await supabase.from('quality_list').update(payload).eq('id', id)
  if (response.error) throw response.error
}

export async function reorderQualityItems(items: QualityListRow[]) {
  const payload = items.map((item, index) => ({ id: item.id, sort: index }))
  const response = await supabase.from('quality_list').upsert(payload)
  if (response.error) throw response.error
}

export async function updateCancelCount(
  id: number,
  field: QualityCountField,
  cancelCount: number,
) {
  await updateQualityItem(id, { [`${field}_cancel`]: cancelCount })
}

export async function updateReturnFlag(
  id: number,
  field: QualityCountField,
  returned: boolean,
) {
  await updateQualityItem(id, {
    [`${field}_return`]: returned,
    [`${field}_cancel`]: 0,
  })
}

export async function updateLotRange(row: QualityListRow, lotStart: number) {
  const total = ALL_COUNT_FIELDS.reduce((sum, key) => sum + Number(row[key] ?? 0), 0)
  await updateQualityItem(row.id, {
    lot_number_startH: lotStart,
    lot_number_endH: total > 0 ? lotStart + total - 1 : lotStart,
  })
}

export async function moveQualityItemDate(id: number, newTestDate: string) {
  await updateQualityItem(id, { test_date: newTestDate })
}

export async function copyQualityItem(row: QualityListRow, newTestDate: string) {
  const companyId = row.companyId ?? (await fetchCompanyId(row.company, row.place))
  const nextSort = await fetchNextSortValue(newTestDate)

  const newData: Record<string, unknown> = {
    company_id: companyId,
    company: row.company,
    place: row.place,
    area: row.area,
    initial: row.initial,
    test_date: newTestDate,
    lot_round: row.lotRound,
    lot_type: row.lotType,
    lot_nameH: row.lotNameH,
    lot_numH: row.lotNumH,
    lot_number_startH: row.lotNumStartH,
    lot_number_endH: row.lotNumEndH,
    totalH: row.totalH,
    lot_ksd: row.lotKsd,
    lot_ksd_num: row.lotKsdNum,
    lot_certification: row.lotCertification,
    a25: 0,
    a32: row.a32,
    a32_cancel: row.a32Cancel,
    a32_return: row.a32Return,
    a40: row.a40,
    a40_cancel: row.a40Cancel,
    a40_return: row.a40Return,
    a50: row.a50,
    a50_cancel: row.a50Cancel,
    a50_return: row.a50Return,
    a65: row.a65,
    a65_cancel: row.a65Cancel,
    a65_return: row.a65Return,
    m65: row.m65,
    m65_cancel: row.m65Cancel,
    m65_return: row.m65Return,
    m80: row.m80,
    m80_cancel: row.m80Cancel,
    m80_return: row.m80Return,
    m100: row.m100,
    m100_cancel: row.m100Cancel,
    m100_return: row.m100Return,
    m125: row.m125,
    m125_cancel: row.m125Cancel,
    m125_return: row.m125Return,
    m150: row.m150,
    m150_cancel: row.m150Cancel,
    m150_return: row.m150Return,
    m200: row.m200,
    m200_cancel: row.m200Cancel,
    m200_return: row.m200Return,
    total: row.total,
    print: row.print,
    welding_check: row.weldingCheck,
    sort: nextSort,
    full_text: `${row.company} ${row.place} ${row.area} ${row.initial} ${row.lotNameH} ${row.lotNumH}`.trim(),
  }

  const response = await supabase.from('quality_list').insert(newData)
  if (response.error) throw response.error
}

export async function fetchLotInfos(testDate: string, lotRound: string): Promise<QualityLotInfo[]> {
  const primary = await supabase
    .from('quality_list_info')
    .select('*')
    .eq('test_date', testDate)
    .eq('lot_round', lotRound)
    .order('no', { ascending: true })

  if (!primary.error) {
    return (primary.data ?? []).map((row) => ({
      id: row.id,
      no: row.no,
      testDate: String(row.test_date ?? ''),
      lotRound: String(row.lot_round ?? ''),
      lotType: String(row.lot_type ?? ''),
      lotName: String(row.lot_name ?? ''),
      lotNum: Number(row.lot_num ?? 0),
    }))
  }

  const fallback = await supabase
    .from('product_list_info')
    .select('*')
    .eq('test_date', testDate)
    .eq('lot_round', lotRound)
    .order('no', { ascending: true })

  if (fallback.error) throw fallback.error
  return (fallback.data ?? []).map((row) => ({
    id: row.id,
    no: row.no,
    testDate: String(row.test_date ?? ''),
    lotRound: String(row.lot_round ?? ''),
    lotType: String(row.lot_type ?? ''),
    lotName: String(row.lot_name ?? ''),
    lotNum: Number(row.lot_num ?? 0),
  }))
}

export async function createLotInfo(input: QualityLotInfo) {
  const existing = await supabase
    .from('quality_list_info')
    .select('id, lot_name, lot_num, lot_type')
    .eq('test_date', input.testDate)
    .eq('lot_round', input.lotRound)

  if (existing.error) throw existing.error

  const duplicated = (existing.data ?? []).some(
    (row) => row.lot_name === input.lotName && String(row.lot_num) === String(input.lotNum),
  )

  if (duplicated) {
    throw new Error('같은 로트 이름과 번호가 이미 존재합니다.')
  }

  const response = await supabase.from('quality_list_info').insert({
    test_date: input.testDate,
    lot_round: input.lotRound,
    lot_type: input.lotType,
    lot_name: input.lotName,
    lot_num: input.lotNum,
  })

  if (response.error) throw response.error
}

export async function searchCompanies(keyword: string): Promise<CompanyRecord[]> {
  if (!keyword.trim()) return []
  const response = await supabase
    .from('company_list')
    .select('id, company, place, initial')
    .or(`company.ilike.%${keyword}%,place.ilike.%${keyword}%`)
    .limit(10)

  if (response.error) throw response.error

  return (response.data ?? []).map((row) => ({
    id: Number(row.id),
    company: String(row.company ?? ''),
    place: String(row.place ?? ''),
    initial: String(row.initial ?? ''),
  }))
}

export function applyLotMeta(form: QualityFormState, lotType: string) {
  const meta = LOT_META[lotType] ?? LOT_META.백관
  form.lotType = lotType as QualityFormState['lotType']
  form.lotKsd = meta.lotKsd
  form.lotCertification = meta.lotCertification
  form.lotKsdNum = meta.lotKsdNum
}

export function buildFormFromRow(row: QualityListRow): QualityFormState {
  const form = createEmptyQualityForm(row.testDate)
  form.id = row.id
  form.companyId = row.companyId
  form.company = row.company
  form.place = row.place
  form.area = row.area
  form.initial = row.initial
  form.testDate = row.testDate
  form.lotRound = row.lotRound as QualityFormState['lotRound']
  form.lotType = (row.lotType || '백관') as QualityFormState['lotType']
  form.lotNameH = row.lotNameH
  form.lotNumH = row.lotNumH
  form.lotKsd = row.lotKsd
  form.lotCertification = row.lotCertification
  form.lotKsdNum = row.lotKsdNum
  form.a32 = row.a32
  form.a40 = row.a40
  form.a50 = row.a50
  form.a65 = row.a65
  form.m65 = row.m65
  form.m80 = row.m80
  form.m100 = row.m100
  form.m125 = row.m125
  form.m150 = row.m150
  form.m200 = row.m200
  form.lotNumStartH = row.lotNumStartH
  form.lotNumEndH = row.lotNumEndH
  return form
}

export async function saveQualityForm(form: QualityFormState) {
  const totalH = totalFromForm(form)
  const isPrint = MAIN_FIELDS.some((field) => Number(form[field]) !== 0)
  const companyId = form.companyId ?? (await fetchCompanyId(form.company, form.place))

  if (!companyId) {
    throw new Error('회사 정보가 연결되지 않았습니다. 회사/현장을 다시 선택해 주세요.')
  }

  const payload: Record<string, unknown> = {
    company_id: companyId,
    company: form.company,
    place: form.place,
    area: form.area,
    initial: form.initial,
    test_date: form.testDate,
    lot_round: form.lotRound,
    lot_numH: totalH === 0 ? null : form.lotNumH,
    lot_nameH: totalH === 0 ? null : form.lotNameH,
    lot_type: form.lotType,
    lot_ksd: form.lotKsd,
    lot_certification: form.lotCertification,
    lot_ksd_num: form.lotKsdNum,
    totalH,
    print: isPrint,
    full_text: buildFullText(form),
    lot_number_startH: form.lotNumStartH,
    lot_number_endH:
      totalH > 0 && form.lotNumStartH > 0 ? form.lotNumStartH + totalH - 1 : form.lotNumEndH,
  }

  for (const key of ALL_COUNT_FIELDS) {
    payload[key] = Number(form[key] ?? 0)
  }

  if (form.id) {
    const response = await supabase.from('quality_list').update(payload).eq('id', form.id)
    if (response.error) throw response.error
    return form.id
  }

  payload.sort = await fetchNextSortValue(form.testDate)
  const response = await supabase.from('quality_list').insert(payload).select('id').single()
  if (response.error) throw response.error
  return Number(response.data.id)
}

export function buildCountBreakdown(row: QualityListRow): QualityCountBreakdown {
  return {
    a32: [row.a32_01, row.a32_02, row.a32_03, row.a32_04, row.a32_05, row.a32_06],
    a40: [row.a40_01, row.a40_02, row.a40_03, row.a40_04, row.a40_05, row.a40_06],
    a50: [row.a50_01, row.a50_02, row.a50_03, row.a50_04, row.a50_05, row.a50_06],
    a65: [row.a65_01, row.a65_02, row.a65_03, row.a65_04, row.a65_05, row.a65_06],
  }
}

export async function saveCountBreakdown(
  row: QualityListRow,
  breakdown: QualityCountBreakdown,
  finalSave: boolean,
) {
  const sum = (values: number[]) => values.reduce((acc, value) => acc + Number(value || 0), 0)

  if (finalSave) {
    if (sum(breakdown.a32) !== row.a32) throw new Error('A32의 합이 다릅니다.')
    if (sum(breakdown.a40) !== row.a40) throw new Error('A40의 합이 다릅니다.')
    if (sum(breakdown.a50) !== row.a50) throw new Error('A50의 합이 다릅니다.')
    if (sum(breakdown.a65) !== row.a65) throw new Error('A65의 합이 다릅니다.')
  }

  const payload: Record<string, unknown> = {
    total: finalSave ? true : row.total,
  }

  ;(['a32', 'a40', 'a50', 'a65'] as const).forEach((sizeKey) => {
    breakdown[sizeKey].forEach((value, index) => {
      payload[`${sizeKey}_0${index + 1}`] = Number(value || 0)
    })
  })

  const response = await supabase.from('quality_list').update(payload).eq('id', row.id)
  if (response.error) throw response.error
}

export async function downloadNoticePdf(fileName: string) {
  const response = await supabase.storage.from('notice-pdf').download(fileName)
  if (response.error) throw response.error

  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function fetchCalculationBundle(companyId: number): Promise<CalculationBundle> {
  const [companies, pipeTypes, fittingTypes, pipeTransactions, fittingTransactions] =
    await Promise.all([
      supabase.from('company_list').select('id, company, place, initial').order('company'),
      supabase
        .from('company_pipe_types')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order'),
      supabase
        .from('company_fitting_types')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order'),
      supabase.from('inventory_transactions_pipe').select('*').eq('company_id', companyId),
      supabase.from('inventory_transactions_fitting').select('*').eq('company_id', companyId),
    ])

  for (const result of [companies, pipeTypes, fittingTypes, pipeTransactions, fittingTransactions]) {
    if (result.error) throw result.error
  }

  return {
    companies: (companies.data ?? []).map((row) => ({
      id: Number(row.id),
      company: String(row.company ?? ''),
      place: String(row.place ?? ''),
      initial: String(row.initial ?? ''),
    })),
    pipeTypes: (pipeTypes.data ?? []) as Array<Record<string, unknown>>,
    fittingTypes: (fittingTypes.data ?? []) as Array<Record<string, unknown>>,
    pipeTransactions: (pipeTransactions.data ?? []) as Array<Record<string, unknown>>,
    fittingTransactions: (fittingTransactions.data ?? []) as Array<Record<string, unknown>>,
  }
}

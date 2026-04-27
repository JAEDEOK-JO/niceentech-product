export const LOT_ROUNDS = ['1차', '2차', '3차', '4차'] as const
export const LOT_TYPES = ['백관', '스케쥴', '서스', '수파이프'] as const
export const LOT_INFO_TYPES = ['비확관', '백관', '스케쥴', '서스', '수파이프'] as const

export type LotRound = (typeof LOT_ROUNDS)[number]
export type LotType = (typeof LOT_TYPES)[number]
export type LotInfoType = (typeof LOT_INFO_TYPES)[number]

export interface CompanyRecord {
  id: number
  company: string
  place: string
  initial: string
}

export interface QualityLotInfo {
  id?: number
  no?: number
  testDate: string
  lotRound: LotRound | string
  lotType: LotInfoType | string
  lotName: string
  lotNum: number
}

export interface QualityListRow {
  id: number
  companyId: number | null
  company: string
  uid: string
  place: string
  area: string
  initial: string
  testDate: string
  lotRound: string
  lotNameH: string
  lotType: string
  lotKsd: string
  lotCertification: string
  lotKsdNum: string
  lotNumH: number
  print: boolean
  a32: number
  a40: number
  a50: number
  a65: number
  m65: number
  m80: number
  m100: number
  m125: number
  m150: number
  m200: number
  lotNumStartH: number
  lotNumEndH: number
  totalH: number
  weldingCheck: boolean
  a32Cancel: number
  a32Return: boolean
  a40Cancel: number
  a40Return: boolean
  a50Cancel: number
  a50Return: boolean
  a65Cancel: number
  a65Return: boolean
  m65Cancel: number
  m65Return: boolean
  m80Cancel: number
  m80Return: boolean
  m100Cancel: number
  m100Return: boolean
  m125Cancel: number
  m125Return: boolean
  m150Cancel: number
  m150Return: boolean
  m200Cancel: number
  m200Return: boolean
  a32_01: number
  a40_01: number
  a50_01: number
  a65_01: number
  a32_02: number
  a40_02: number
  a50_02: number
  a65_02: number
  a32_03: number
  a40_03: number
  a50_03: number
  a65_03: number
  a32_04: number
  a40_04: number
  a50_04: number
  a65_04: number
  a32_05: number
  a40_05: number
  a50_05: number
  a65_05: number
  a32_06: number
  a40_06: number
  a50_06: number
  a65_06: number
  total: boolean
  sort: number
  noticeDownloaded: boolean
  companyInfo?: {
    company?: string
    place?: string
  } | null
}

export interface QualityListFilters {
  testDate: string
  searchQuery: string
  showAllRecords: boolean
}

export interface QualityFormState {
  id?: number
  companyId: number | null
  company: string
  place: string
  area: string
  initial: string
  testDate: string
  lotRound: LotRound
  lotType: LotType
  lotNameH: string
  lotNumH: number | null
  lotKsd: string
  lotCertification: string
  lotKsdNum: string
  a32: number
  a40: number
  a50: number
  a65: number
  m65: number
  m80: number
  m100: number
  m125: number
  m150: number
  m200: number
  lotNumStartH: number
  lotNumEndH: number
}

export interface QualityCountBreakdown {
  a32: number[]
  a40: number[]
  a50: number[]
  a65: number[]
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number') return value
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const toBoolean = (value: unknown) => Boolean(value)
const toStringValue = (value: unknown) => String(value ?? '')

export function mapQualityListRow(raw: Record<string, unknown>): QualityListRow {
  return {
    id: toNumber(raw.id),
    companyId: raw.company_id == null ? null : toNumber(raw.company_id),
    company: toStringValue(raw.company),
    uid: toStringValue(raw.uid),
    place: toStringValue(raw.place),
    area: toStringValue(raw.area),
    initial: toStringValue(raw.initial),
    testDate: toStringValue(raw.test_date),
    lotRound: toStringValue(raw.lot_round),
    lotNameH: toStringValue(raw.lot_nameH),
    lotType: toStringValue(raw.lot_type),
    lotKsd: toStringValue(raw.lot_ksd),
    lotCertification: toStringValue(raw.lot_certification),
    lotKsdNum: toStringValue(raw.lot_ksd_num),
    lotNumH: toNumber(raw.lot_numH),
    print: toBoolean(raw.print),
    a32: toNumber(raw.a32),
    a40: toNumber(raw.a40),
    a50: toNumber(raw.a50),
    a65: toNumber(raw.a65),
    m65: toNumber(raw.m65),
    m80: toNumber(raw.m80),
    m100: toNumber(raw.m100),
    m125: toNumber(raw.m125),
    m150: toNumber(raw.m150),
    m200: toNumber(raw.m200),
    lotNumStartH: toNumber(raw.lot_number_startH),
    lotNumEndH: toNumber(raw.lot_number_endH),
    totalH: toNumber(raw.totalH),
    weldingCheck: toBoolean(raw.welding_check),
    a32Cancel: toNumber(raw.a32_cancel),
    a32Return: toBoolean(raw.a32_return),
    a40Cancel: toNumber(raw.a40_cancel),
    a40Return: toBoolean(raw.a40_return),
    a50Cancel: toNumber(raw.a50_cancel),
    a50Return: toBoolean(raw.a50_return),
    a65Cancel: toNumber(raw.a65_cancel),
    a65Return: toBoolean(raw.a65_return),
    m65Cancel: toNumber(raw.m65_cancel),
    m65Return: toBoolean(raw.m65_return),
    m80Cancel: toNumber(raw.m80_cancel),
    m80Return: toBoolean(raw.m80_return),
    m100Cancel: toNumber(raw.m100_cancel),
    m100Return: toBoolean(raw.m100_return),
    m125Cancel: toNumber(raw.m125_cancel),
    m125Return: toBoolean(raw.m125_return),
    m150Cancel: toNumber(raw.m150_cancel),
    m150Return: toBoolean(raw.m150_return),
    m200Cancel: toNumber(raw.m200_cancel),
    m200Return: toBoolean(raw.m200_return),
    a32_01: toNumber(raw.a32_01),
    a40_01: toNumber(raw.a40_01),
    a50_01: toNumber(raw.a50_01),
    a65_01: toNumber(raw.a65_01),
    a32_02: toNumber(raw.a32_02),
    a40_02: toNumber(raw.a40_02),
    a50_02: toNumber(raw.a50_02),
    a65_02: toNumber(raw.a65_02),
    a32_03: toNumber(raw.a32_03),
    a40_03: toNumber(raw.a40_03),
    a50_03: toNumber(raw.a50_03),
    a65_03: toNumber(raw.a65_03),
    a32_04: toNumber(raw.a32_04),
    a40_04: toNumber(raw.a40_04),
    a50_04: toNumber(raw.a50_04),
    a65_04: toNumber(raw.a65_04),
    a32_05: toNumber(raw.a32_05),
    a40_05: toNumber(raw.a40_05),
    a50_05: toNumber(raw.a50_05),
    a65_05: toNumber(raw.a65_05),
    a32_06: toNumber(raw.a32_06),
    a40_06: toNumber(raw.a40_06),
    a50_06: toNumber(raw.a50_06),
    a65_06: toNumber(raw.a65_06),
    total: toBoolean(raw.total),
    sort: toNumber(raw.sort),
    noticeDownloaded: toBoolean(raw.notice_downloaded),
    companyInfo:
      raw.company_list && typeof raw.company_list === 'object'
        ? (raw.company_list as { company?: string; place?: string })
        : null,
  }
}

export function createEmptyQualityForm(testDate: string): QualityFormState {
  return {
    companyId: null,
    company: '',
    place: '',
    area: '',
    initial: '',
    testDate,
    lotRound: '1차',
    lotType: '백관',
    lotNameH: '',
    lotNumH: null,
    lotKsd: 'KSD 3507',
    lotCertification: '분기 25-36',
    lotKsdNum: '',
    a32: 0,
    a40: 0,
    a50: 0,
    a65: 0,
    m65: 0,
    m80: 0,
    m100: 0,
    m125: 0,
    m150: 0,
    m200: 0,
    lotNumStartH: 0,
    lotNumEndH: 0,
  }
}

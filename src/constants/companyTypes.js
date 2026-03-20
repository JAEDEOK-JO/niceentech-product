export const COMPANY_TYPE_OPTIONS = ['아파트', '물류센터', '5층 이하', '15층 이하', '오피스텔']

const COMPANY_TYPE_ALIASES = {
  '5층 미만': '5층 이하',
  '5층미만': '5층 이하',
  '5층이하': '5층 이하',
  '15층 미만': '15층 이하',
  '15층미만': '15층 이하',
  '15층이하': '15층 이하',
}

export const normalizeCompanyType = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const normalized = COMPANY_TYPE_ALIASES[raw] ?? raw
  return COMPANY_TYPE_OPTIONS.includes(normalized) ? normalized : normalized
}

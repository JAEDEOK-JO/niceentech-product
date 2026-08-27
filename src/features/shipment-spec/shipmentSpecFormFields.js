export const SHIPMENT_SPEC_COMPANY_ADDRESS =
  '경기도 화성시 남양읍 주석로 356 TEL. 031)352-1163 , FAX 031)352-1164'

export const SHIPMENT_SPEC_COMPANY_NAME = '주식회사 나이스엔테크'

export const SHIPMENT_SPEC_FORM_ROWS = [
  { key: 'company', label: '발 주 처' },
  { key: 'place', label: '현 장 명' },
  { key: 'drawing', label: '도 면 명' },
  { key: 'area', label: '구 역' },
]

export const buildShipmentSpecForm = (row, remarks = '') => ({
  company: String(row?.company ?? '').trim(),
  place: String(row?.place ?? '').trim(),
  drawing: String(row?.initial ?? '').trim(),
  area: String(row?.area ?? '').trim(),
  remarks: String(remarks ?? '').trim(),
})

export const buildShipmentSpecPrintSheets = (row, remarksList) => {
  const texts = Array.isArray(remarksList) && remarksList.length > 0 ? remarksList : ['']
  return texts.map((text) => buildShipmentSpecForm(row, text))
}

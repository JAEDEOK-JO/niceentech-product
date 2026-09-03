import type { QualityListRow } from '../../types/quality'
import { formatPrintQty } from './format'

export interface NoticeQtyRow {
  label: string
  qty: string
}

export interface NoticeCertificateModel {
  place: string
  area: string
  receiptNum: string
  certification: string
  lotNumH: string
  passNumber: string
  qtyRows: NoticeQtyRow[]
  totalH: string
  testDate: string
}

export function toCertificationCode(lotCertification: string): string {
  return String(lotCertification ?? '').replaceAll('분기 ', '').trim()
}

export function toJoinCertificateFileName(lotCertification: string, lotNumH: number | string): string {
  return `${toCertificationCode(lotCertification)} ${lotNumH}.pdf`
}

export function toCertificateListFileName(place: string, area: string): string {
  return `${place} ${area} 인증리스트.pdf`.replace(/\s+/g, ' ').trim()
}

export function nominalLabelOf(lotType: string): string {
  return lotType === '수파이프' ? '75A' : '65A'
}

export function buildNoticeCertificateModel(
  row: QualityListRow,
  receiptNum: number | string,
  lotType: string,
): NoticeCertificateModel {
  const start = row.lotNumStartH || ''
  const end = row.lotNumEndH || ''

  return {
    place: row.place,
    area: row.area,
    receiptNum: String(receiptNum ?? ''),
    certification: row.lotCertification,
    lotNumH: String(row.lotNumH ?? ''),
    passNumber: `${row.lotNameH} ${start} ~ ${end}`.trim(),
    qtyRows: [
      { label: '32A', qty: formatPrintQty(row.a32) },
      { label: '40A', qty: formatPrintQty(row.a40) },
      { label: '50A', qty: formatPrintQty(row.a50) },
      { label: nominalLabelOf(lotType), qty: formatPrintQty(row.a65 + row.m65) },
      { label: '80A', qty: formatPrintQty(row.m80) },
      { label: '100A', qty: formatPrintQty(row.m100) },
      { label: '125A', qty: formatPrintQty(row.m125) },
      { label: '150A', qty: formatPrintQty(row.m150) },
    ],
    totalH: String(row.totalH ?? ''),
    testDate: row.testDate,
  }
}

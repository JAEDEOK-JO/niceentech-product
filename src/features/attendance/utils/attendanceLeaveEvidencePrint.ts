import type { AttendanceRequest } from '../types/attendance'
import { normalizeEvidenceUrls } from './attendanceEvidence'

const escapeAttr = (value: string) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')

export function listAttendanceEvidenceUrls(item: AttendanceRequest): string[] {
  return normalizeEvidenceUrls(item?.evidenceUrls)
}

export function buildAttendanceEvidencePageHtml(dataUrl: string): string {
  const src = escapeAttr(dataUrl)
  if (!src) return ''
  return `<div class="evidence-print"><img src="${src}" alt="" /></div>`
}

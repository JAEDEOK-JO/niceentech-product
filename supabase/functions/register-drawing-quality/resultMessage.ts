import type { PageEntry } from './runStore.ts'
import type { PipeRecord } from './aggregateRecords.ts'

export function failureMessage(detail: string) {
  if (detail === 'company_missing') return '회사 연결 실패'
  if (detail === 'test_date_missing') return '검수일이 없습니다'
  if (detail === 'plan_missing') return '생산계획을 찾지 못했습니다'
  if (detail === 'openai_key_missing') return 'API 키 없음'
  if (detail === 'drawing_missing') return '도면 파일을 찾지 못했습니다'
  if (detail === 'pdf_empty') return '도면 페이지가 없습니다'
  if (detail === 'insert_failed') return '검수리스트 등록 실패'
  if (detail.startsWith('openai_')) return '도면 수량 읽기 실패'
  return detail.slice(0, 80) || '검수리스트 등록 실패'
}

function diameterLabel(value: string) {
  return /^\d+$/.test(value) ? `${value}A` : ''
}

function recordIssue(record: PipeRecord) {
  const where = [
    `${record.pdf_page}장`,
    record.pipe_no ? `${record.pipe_no}번` : '',
    diameterLabel(record.body_diameter),
    record.pipe_part && record.pipe_part !== '단일' ? record.pipe_part : '',
    !record.pipe_part || record.pipe_part === '단일' ? record.location : '',
  ].filter(Boolean).join(' ')
  const why = record.reason || record.check_note
  if (!where && !why) return ''
  return why ? `${where}, ${why}` : where
}

export function completionMessage(input: {
  state: 'done' | 'review' | 'failed'
  pages: PageEntry[]
  records: PipeRecord[]
  error: string | null
}) {
  if (input.state === 'failed') return failureMessage(input.error ?? 'openai_failed')

  const lines: string[] = []
  const push = (line: string) => {
    const text = line.trim()
    if (text && !lines.includes(text)) lines.push(text)
  }

  for (const page of input.pages) {
    if (page.state === 'failed' || page.state === 'pending') {
      push(page.unread_reason ? `${page.pdf_page}장 읽기 실패, ${page.unread_reason}` : `${page.pdf_page}장 읽기 실패`)
      continue
    }
    if (page.state === 'read' && !page.fully_read && page.unread_reason) {
      push(`${page.pdf_page}장, ${page.unread_reason}`)
    }
  }

  for (const record of input.records) {
    if (record.status !== 'uncertain') continue
    push(recordIssue(record))
  }

  return lines.join('\n')
}

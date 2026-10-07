import { markDuplicateRecords, normalizeRecord, type PipeRecord } from './aggregateRecords.ts'
import type { SharedNote } from './quantityPrompts.ts'
import type { PageEntry, QuantityRun, QuantityTask } from './runStore.ts'

const MAX_ZOOM_TASKS = 12
const MIN_REGION_SPAN = 0.01

const asText = (value: unknown) => String(value ?? '').trim()

export function initialPages(pageCount: number): PageEntry[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    pdf_page: index + 1,
    page_kind: '',
    analyze: true,
    state: 'pending',
    reason: '',
    fully_read: false,
    unread_reason: '',
    quantity_notes: [],
  }))
}

export function applySurvey(run: QuantityRun, survey: QuantityTask | undefined) {
  const pages = run.pages.map((page) => ({ ...page }))
  const pageCount = run.page_count ?? pages.length
  let notes: SharedNote[] = []

  if (survey?.state === 'done' && survey.result) {
    const surveyed = Array.isArray(survey.result.pages) ? survey.result.pages : []
    for (const item of surveyed as Record<string, unknown>[]) {
      const page = pages.find((entry) => entry.pdf_page === Number(item.pdf_page))
      if (!page) continue
      page.page_kind = asText(item.page_kind)
      page.analyze = item.analyze !== false
      page.reason = asText(item.reason)
      if (!page.analyze) page.state = 'excluded'
    }

    const rawNotes = Array.isArray(survey.result.shared_notes) ? survey.result.shared_notes : []
    notes = (rawNotes as Record<string, unknown>[]).map((note) => ({
      source_page: Number(note.source_page) || 0,
      text: asText(note.text),
      applies_to_pages: (Array.isArray(note.applies_to_pages) ? note.applies_to_pages : [])
        .map(Number)
        .filter((pageNo) => pageNo >= 1 && pageNo <= pageCount),
      scope: asText(note.scope),
    })).filter((note) => note.text)
  }

  const pagesToRead = pages.filter((page) => page.state !== 'excluded').map((page) => page.pdf_page)
  return { pages, notes, pagesToRead }
}

export function collectPageResults(run: QuantityRun, pageTasks: QuantityTask[]) {
  const pages = run.pages.map((page) => ({ ...page }))
  const records: PipeRecord[] = []

  for (const task of pageTasks) {
    const pageNo = task.pages[0]
    const page = pages.find((entry) => entry.pdf_page === pageNo)
    if (!page) continue

    if (task.state !== 'done' || !task.result) {
      page.state = 'failed'
      page.unread_reason = task.error ?? '판독 실패'
      continue
    }

    const info = (task.result.page ?? {}) as Record<string, unknown>
    page.page_kind = asText(info.page_kind) || page.page_kind
    page.quantity_notes = (Array.isArray(info.quantity_notes) ? info.quantity_notes : []).map((note) => ({
      text: asText((note as Record<string, unknown>).text),
      scope: asText((note as Record<string, unknown>).scope),
    }))
    page.fully_read = info.fully_read === true
    page.unread_reason = asText(info.unread_reason)

    if (info.analyzed === false) {
      page.state = 'excluded'
      page.reason = asText(info.exclusion_reason) || page.reason
      continue
    }

    page.state = 'read'
    const rawRecords = Array.isArray(task.result.records) ? task.result.records : []
    rawRecords.forEach((raw, index) => {
      records.push(normalizeRecord(raw as Record<string, unknown>, pageNo, `p${pageNo}-${index + 1}`, 'page'))
    })
  }

  return { pages, records: markDuplicateRecords(records) }
}

function regionSpan(record: PipeRecord) {
  const { x0, y0, x1, y1 } = record.region
  return Math.min(Math.abs(x1 - x0), Math.abs(y1 - y0))
}

export function zoomCandidates(run: QuantityRun) {
  return run.records
    .filter((record) => record.status === 'uncertain' && regionSpan(record) >= MIN_REGION_SPAN)
    .slice(0, MAX_ZOOM_TASKS)
    .map((record) => {
      const page = run.pages.find((entry) => entry.pdf_page === record.pdf_page)
      const quantityNotes = (page?.quantity_notes ?? []).map((note) => `${note.text} (적용 범위: ${note.scope || '미기재'})`).join('\n')
      const { key: _key, source: _source, check_note: _note, ...record_for_prompt } = record
      return {
        kind: 'zoom' as const,
        pages: [record.pdf_page],
        recordKey: record.key,
        context: { record: record_for_prompt, quantityNotes },
      }
    })
}

export function mergeZoomResults(run: QuantityRun, zoomTasks: QuantityTask[]) {
  let records = [...run.records]

  for (const task of zoomTasks) {
    const key = task.record_key
    const index = records.findIndex((record) => record.key === key)
    if (index < 0) continue
    const original = records[index]

    if (task.state !== 'done' || !task.result) {
      records[index] = { ...original, check_note: '확대 재판독 실패' }
      continue
    }

    const found = task.result.found === true
    const raw = Array.isArray(task.result.records) ? task.result.records : []
    if (!found || raw.length === 0) {
      records[index] = { ...original, check_note: '확대 영역에서 찾지 못함' }
      continue
    }

    const replacements = raw.map((item, itemIndex) => {
      const record = normalizeRecord(item as Record<string, unknown>, original.pdf_page, `${original.key}-z${itemIndex + 1}`, 'zoom')
      return { ...record, region: original.region }
    })
    records = [...records.slice(0, index), ...replacements, ...records.slice(index + 1)]
  }

  return markDuplicateRecords(records)
}

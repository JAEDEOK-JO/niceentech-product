import { supabase } from '@/lib/supabase'
import { toJoinCertificateFileName } from '../utils/print/notice-certificate'

export interface ReceiptInfo {
  receiptNum: number | string
  lotType: string
}

export interface JoinCertificateFile {
  fileName: string
  bytes: Blob
}

function storageErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error ?? '')
  const e = error as { message?: string; error?: string; statusCode?: string | number }
  return `${e.statusCode ?? ''} ${e.message ?? ''} ${e.error ?? ''}`
}

function textMeansMissingPdf(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('404') ||
    lower.includes('not found') ||
    lower.includes('nosuchkey') ||
    lower.includes('object not found')
  )
}

export async function isMissingNoticePdf(error: unknown): Promise<boolean> {
  if (textMeansMissingPdf(storageErrorText(error))) return true

  const original = (error as { originalError?: unknown } | null)?.originalError
  if (original instanceof Response) {
    try {
      return textMeansMissingPdf(await original.clone().text())
    } catch {
      return false
    }
  }

  return false
}

export function downloadBlob(fileName: string, data: Blob) {
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function hasReceiptNum(value: unknown): boolean {
  return !(value == null || String(value) === '0' || String(value).trim() === '')
}

export async function fetchReceiptInfo(input: {
  testDate: string
  lotNum: number
  lotType: string
  lotRound?: string
  lotName?: string
}): Promise<ReceiptInfo | null> {
  const response = await supabase
    .from('quality_list_info')
    .select('receipt_num, lot_type, lot_round, lot_name')
    .eq('test_date', input.testDate)
    .eq('lot_num', input.lotNum)

  if (response.error) throw response.error

  const rows = (response.data ?? []) as Array<{
    receipt_num?: unknown
    lot_type?: unknown
    lot_round?: unknown
    lot_name?: unknown
  }>

  const ranked = rows
    .map((row) => {
      let score = 0
      if (input.lotName && String(row.lot_name ?? '') === input.lotName) score += 4
      if (input.lotType && String(row.lot_type ?? '') === input.lotType) score += 2
      if (input.lotRound && String(row.lot_round ?? '') === input.lotRound) score += 1
      return { row, score }
    })
    .sort((a, b) => b.score - a.score)

  const picked = ranked.find((item) => hasReceiptNum(item.row.receipt_num)) ?? ranked[0]
  if (!picked || !hasReceiptNum(picked.row.receipt_num)) return null

  return {
    receiptNum: picked.row.receipt_num as number | string,
    lotType: String(picked.row.lot_type ?? input.lotType),
  }
}

export async function downloadJoinCertificatePdf(input: {
  lotCertification: string
  lotNumH: number
}): Promise<JoinCertificateFile | null> {
  const fileName = toJoinCertificateFileName(input.lotCertification, input.lotNumH)
  const response = await supabase.storage.from('notice-pdf').download(fileName)
  if (response.error) {
    if (await isMissingNoticePdf(response.error)) return null
    throw response.error
  }

  return { fileName, bytes: response.data }
}

export async function markNoticeDownloaded(id: number) {
  const response = await supabase
    .from('quality_list')
    .update({ notice_downloaded: true })
    .eq('id', id)

  if (response.error) throw response.error
}

export async function saveNoticeBundleToFolder(input: {
  company: string
  place: string
  testDate: string
  joinFileName: string
  joinBytes: Blob
  listFileName: string
  html: string
}): Promise<{ success: boolean; dir?: string; error?: string }> {
  const saveNoticeBundle = window.electronAPI?.saveNoticeBundle
  if (typeof saveNoticeBundle !== 'function') {
    return { success: false, error: 'desktop-only' }
  }

  const joinBytes = new Uint8Array(await input.joinBytes.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < joinBytes.length; i += chunkSize) {
    binary += String.fromCharCode(...joinBytes.subarray(i, i + chunkSize))
  }

  try {
    return await saveNoticeBundle({
      company: input.company,
      place: input.place,
      testDate: input.testDate,
      joinFileName: input.joinFileName,
      joinBytesBase64: btoa(binary),
      listFileName: input.listFileName,
      html: input.html,
    })
  } catch (error) {
    console.error('[notice] saveNoticeBundle invoke failed', error)
    return { success: false, error: formatNoticeError(error) }
  }
}

export function formatNoticeError(error: unknown): string {
  if (error == null || error === '') return '알 수 없는 오류'

  if (typeof error === 'string') {
    if (error === 'desktop-only') return '데스크톱 앱에서만 네트워크 폴더에 저장할 수 있습니다'
    return error
  }

  if (error instanceof Error && error.message) return error.message

  if (typeof error === 'object') {
    const e = error as {
      message?: string
      error?: string
      details?: string
      hint?: string
      code?: string
      statusCode?: string | number
    }
    const parts = [e.message, e.error, e.details, e.hint, e.code, e.statusCode]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
    if (parts.length) return formatNoticeError(parts[0] === 'desktop-only' ? 'desktop-only' : parts.join('\n'))
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

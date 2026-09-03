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

export function isMissingNoticePdf(error: unknown): boolean {
  const text = storageErrorText(error).toLowerCase()
  return (
    text.includes('404') ||
    text.includes('not found') ||
    text.includes('nosuchkey') ||
    text.includes('object not found')
  )
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

export async function fetchReceiptInfo(input: {
  testDate: string
  lotNum: number
  lotType: string
}): Promise<ReceiptInfo | null> {
  const response = await supabase
    .from('quality_list_info')
    .select('receipt_num, lot_type')
    .eq('test_date', input.testDate)
    .eq('lot_num', input.lotNum)
    .eq('lot_type', input.lotType)
    .limit(1)

  if (response.error) throw response.error

  const row = response.data?.[0] as { receipt_num?: unknown; lot_type?: unknown } | undefined
  if (!row) return null

  const receiptNum = row.receipt_num
  if (receiptNum == null || String(receiptNum) === '0' || String(receiptNum).trim() === '') {
    return null
  }

  return {
    receiptNum: receiptNum as number | string,
    lotType: String(row.lot_type ?? input.lotType),
  }
}

export async function downloadJoinCertificatePdf(input: {
  lotCertification: string
  lotNumH: number
}): Promise<JoinCertificateFile | null> {
  const fileName = toJoinCertificateFileName(input.lotCertification, input.lotNumH)
  const response = await supabase.storage.from('notice-pdf').download(fileName)
  if (response.error) {
    if (isMissingNoticePdf(response.error)) return null
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

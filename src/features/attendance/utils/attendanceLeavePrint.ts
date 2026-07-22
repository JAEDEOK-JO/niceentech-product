import { createApp, h, nextTick } from 'vue'
import AttendanceLeaveApplicationDocument from '../components/AttendanceLeaveApplicationDocument.vue'
import documentCss from '../components/attendanceLeaveDocument.css?raw'
import type { AttendanceRequest, Employee } from '../types/attendance'
import { getLeaveApplicationDocumentTitle } from './attendanceLeaveType'

type PrintResult = {
  success?: boolean
  errorType?: string
}

type PrintHtmlOptions = {
  html: string
  landscape?: boolean
  pageSize?: string
  silent?: boolean
  scaleFactor?: number
}

const PRINT_STYLE = `
${documentCss}

@page {
  size: A4 portrait;
  margin: 14mm;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #0f172a;
  font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.print-root {
  width: 100%;
  max-width: 180mm;
  margin: 0 auto;
}

.print-page {
  page-break-after: always;
  break-after: page;
  min-height: 255mm;
}

.print-page:last-child {
  page-break-after: auto;
  break-after: auto;
}
`

function toAbsoluteUrl(url: string) {
  const raw = String(url ?? '').trim()
  if (!raw) return raw
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw
  return new URL(raw, window.location.origin).href
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const absolute = toAbsoluteUrl(url)
  if (!absolute || absolute.startsWith('data:')) return absolute

  try {
    const response = await fetch(absolute)
    if (!response.ok) return absolute
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? absolute))
      reader.onerror = () => resolve(absolute)
      reader.readAsDataURL(blob)
    })
  } catch {
    return absolute
  }
}

async function inlineImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll('img[src]'))
  await Promise.all(images.map(async (img) => {
    const src = img.getAttribute('src')
    if (!src) return
    const dataUrl = await fetchAsDataUrl(src)
    if (dataUrl) img.setAttribute('src', dataUrl)
  }))
}

function buildPrintHtml(pages: string[], title: string) {
  const body = pages
    .map((page) => `<div class="print-page">${page}</div>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${PRINT_STYLE}</style>
</head>
<body>
  <div class="print-root">${body}</div>
</body>
</html>`
}

function isCanceledPrint(result: PrintResult | null | undefined) {
  const errorType = String(result?.errorType ?? '')
  return errorType === 'Print job canceled'
    || errorType === 'cancelled'
    || errorType === 'canceled'
}

async function renderLeaveApplicationContent(
  item: AttendanceRequest,
  employees: Employee[],
): Promise<string> {
  const mountNode = document.createElement('div')
  mountNode.style.position = 'fixed'
  mountNode.style.left = '-10000px'
  mountNode.style.top = '0'
  document.body.appendChild(mountNode)

  const app = createApp({
    render: () => h(AttendanceLeaveApplicationDocument, {
      item,
      employees,
      printMode: true,
    }),
  })

  app.mount(mountNode)
  await nextTick()
  await inlineImages(mountNode)

  const content = mountNode.innerHTML
  app.unmount()
  document.body.removeChild(mountNode)

  return content
}

async function invokeElectronPrint(html: string) {
  const electronAPI = window.electronAPI

  if (!electronAPI?.printHtmlDocument) {
    window.alert('인쇄는 Electron 앱에서만 지원됩니다.')
    return false
  }

  const options: PrintHtmlOptions = {
    html,
    landscape: false,
    pageSize: 'A4',
    silent: false,
    scaleFactor: 100,
  }

  const result = await electronAPI.printHtmlDocument(options)
  if (result?.success) return true
  if (isCanceledPrint(result)) return false

  const fallback = await electronAPI.printHtmlDocument({
    ...options,
    silent: true,
  })

  if (fallback?.success) return true
  if (isCanceledPrint(fallback)) return false

  window.alert(`인쇄에 실패했습니다.\n사유: ${fallback?.errorType || result?.errorType || '알 수 없음'}`)
  return false
}

export async function printAttendanceLeaveApplication(
  item: AttendanceRequest,
  employees: Employee[],
): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const content = await renderLeaveApplicationContent(item, employees)
  const docTitle = getLeaveApplicationDocumentTitle(item.leaveType)
  const html = buildPrintHtml([content], `${docTitle}_${item.userName}`)
  return invokeElectronPrint(html)
}

export async function printAllApprovedAttendanceLeaveApplications(
  items: AttendanceRequest[],
  employees: Employee[],
): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const approvedItems = items.filter((item) => item.status === '승인')
  if (approvedItems.length === 0) {
    window.alert('인쇄할 승인 건이 없습니다.')
    return false
  }

  const pages = await Promise.all(
    approvedItems.map((item) => renderLeaveApplicationContent(item, employees)),
  )
  const html = buildPrintHtml(pages, '휴가신청서_전체')
  return invokeElectronPrint(html)
}

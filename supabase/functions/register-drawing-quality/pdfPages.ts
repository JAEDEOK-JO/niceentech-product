import { PDFDocument, degrees, type PDFPage } from 'npm:pdf-lib@1.17.1'

export type PageRegion = { x0: number; y0: number; x1: number; y1: number }

const REGION_MARGIN = 0.06
const ZOOM_LONG_SIDE_PT = 1684

async function appendUprightPage(target: PDFDocument, page: PDFPage) {
  const angle = ((page.getRotation().angle % 360) + 360) % 360
  const { width, height } = page.getSize()
  const embedded = await target.embedPage(page)

  if (angle === 90) {
    target.addPage([height, width]).drawPage(embedded, { x: 0, y: width, rotate: degrees(-90) })
  } else if (angle === 270) {
    target.addPage([height, width]).drawPage(embedded, { x: height, y: 0, rotate: degrees(90) })
  } else if (angle === 180) {
    target.addPage([width, height]).drawPage(embedded, { x: width, y: height, rotate: degrees(180) })
  } else {
    target.addPage([width, height]).drawPage(embedded, { x: 0, y: 0 })
  }
}

export async function countPdfPages(bytes: Uint8Array) {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return source.getPageCount()
}

export async function buildUprightPdf(bytes: Uint8Array, pageNumbers?: number[]) {
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const target = await PDFDocument.create()
  const total = source.getPageCount()
  const wanted = pageNumbers?.length ? pageNumbers : Array.from({ length: total }, (_, index) => index + 1)

  for (const pageNo of wanted) {
    if (pageNo < 1 || pageNo > total) throw new Error(`page_out_of_range:${pageNo}`)
    await appendUprightPage(target, source.getPage(pageNo - 1))
  }

  return await target.save()
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

export async function buildRegionPdf(bytes: Uint8Array, pageNo: number, region: PageRegion) {
  const upright = await PDFDocument.load(await buildUprightPdf(bytes, [pageNo]))
  const page = upright.getPage(0)
  const { width, height } = page.getSize()

  const x0 = clamp01(Math.min(region.x0, region.x1) - REGION_MARGIN)
  const x1 = clamp01(Math.max(region.x0, region.x1) + REGION_MARGIN)
  const y0 = clamp01(Math.min(region.y0, region.y1) - REGION_MARGIN)
  const y1 = clamp01(Math.max(region.y0, region.y1) + REGION_MARGIN)
  if (x1 - x0 < 0.02 || y1 - y0 < 0.02) throw new Error('region_too_small')

  const box = {
    left: x0 * width,
    right: x1 * width,
    bottom: (1 - y1) * height,
    top: (1 - y0) * height,
  }
  const boxWidth = box.right - box.left
  const boxHeight = box.top - box.bottom
  const scale = ZOOM_LONG_SIDE_PT / Math.max(boxWidth, boxHeight)

  const target = await PDFDocument.create()
  const embedded = await target.embedPage(page, box)
  target.addPage([boxWidth * scale, boxHeight * scale]).drawPage(embedded, {
    x: 0,
    y: 0,
    width: boxWidth * scale,
    height: boxHeight * scale,
  })
  return await target.save()
}

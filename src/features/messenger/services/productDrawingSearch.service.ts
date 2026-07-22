import { supabase } from '@/lib/supabase'
import type { ProductionRequestPayload } from '../utils/productionRequestMessage'

export type ProductDrawingSearchItem = {
  id: number
  initial: string
  name: string
  company: string
  place: string
  area: string
  testDate: string
  hasDrawing: boolean
}

const escapeIlike = (value: string) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')

export async function searchProductDrawings(
  keyword: string,
  limit = 20,
): Promise<{ ok: true; items: ProductDrawingSearchItem[] } | { ok: false; reason: string }> {
  const term = String(keyword ?? '').trim()
  if (!term) return { ok: true, items: [] }

  const pattern = `%${escapeIlike(term)}%`
  const quoted = `"${pattern.replace(/"/g, '\\"')}"`
  const { data, error } = await supabase
    .from('product_list')
    .select('id, initial, name, company, place, area, test_date, is_drawing')
    .or(
      [
        `initial.ilike.${quoted}`,
        `name.ilike.${quoted}`,
        `company.ilike.${quoted}`,
        `place.ilike.${quoted}`,
        `area.ilike.${quoted}`,
      ].join(','),
    )
    .order('id', { ascending: false })
    .limit(limit)

  if (error) return { ok: false, reason: error.message }

  const items = (data ?? []).map((row) => ({
    id: Number(row.id),
    initial: String(row.initial ?? '').trim(),
    name: String(row.name ?? '').trim(),
    company: String(row.company ?? '').trim(),
    place: String(row.place ?? '').trim(),
    area: String(row.area ?? '').trim(),
    testDate: String(row.test_date ?? '').trim(),
    hasDrawing: Boolean(row.is_drawing),
  }))

  return { ok: true, items }
}

export type ProductDrawingFileItem = {
  id: number
  name: string
  viewUrl: string
}

export async function fetchProductDrawingFiles(
  productId: number,
): Promise<{ ok: true; files: ProductDrawingFileItem[] } | { ok: false; reason: string; files: ProductDrawingFileItem[] }> {
  if (!productId) return { ok: true, files: [] }

  const { data, error } = await supabase
    .from('drawing_pdf')
    .select('id, name, storage_url, url, created_at')
    .eq('product_list_id', productId)
    .order('created_at', { ascending: false })

  if (error) return { ok: false, reason: error.message, files: [] }

  const files = (data ?? [])
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name ?? '').trim() || `도면-${row.id}`,
      viewUrl: String(row.storage_url ?? row.url ?? '').trim(),
    }))
    .filter((row) => row.viewUrl)

  return { ok: true, files }
}

export async function fetchProductDrawingViewUrl(productId: number): Promise<string> {
  const result = await fetchProductDrawingFiles(productId)
  return result.files[0]?.viewUrl ?? ''
}

export function buildProductionRequestPayload(input: {
  product: ProductDrawingSearchItem
  requestType: string
  requestTypeLabel: string
  requestText: string
  recipients: string[]
  drawingUrl?: string
  drawings?: ProductDrawingFileItem[]
}): ProductionRequestPayload {
  const drawings = (input.drawings ?? [])
    .map((file) => ({
      id: Number(file.id),
      name: String(file.name ?? '').trim(),
      viewUrl: String(file.viewUrl ?? '').trim(),
    }))
    .filter((file) => file.viewUrl)

  return {
    v: 1,
    productId: input.product.id,
    initial: input.product.initial,
    name: input.product.name,
    company: input.product.company,
    place: input.product.place,
    area: input.product.area,
    testDate: String(input.product.testDate ?? '').trim(),
    hasDrawing: Boolean(input.product.hasDrawing) || drawings.length > 0,
    drawingUrl: String(input.drawingUrl ?? drawings[0]?.viewUrl ?? '').trim(),
    drawings,
    requestType: input.requestType as ProductionRequestPayload['requestType'],
    requestTypeLabel: String(input.requestTypeLabel ?? '').trim(),
    requestText: String(input.requestText ?? '').trim(),
    recipients: [...input.recipients],
  }
}

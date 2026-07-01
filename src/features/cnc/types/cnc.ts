export interface CncCompanySearchResult {
  id: number
  company: string
  place: string
  fullName: string
  drawingNo: string
  managerName: string
}

export interface CncItem {
  id: number
  productListId: number | null
  company: string
  place: string
  area: string
  drawingNo: string
  kind: string
  quantity: number
  length: number
  isCompleted: boolean
  createdAt: string
  completedAt: string
}

export interface CncItemForm {
  company: string
  place: string
  area: string
  drawingNo: string
  kind: string
  quantity: number
  length: number
  productListId?: number | null
}

export function mapCncItem(row: Record<string, unknown>): CncItem {
  return {
    id: Number(row.id ?? 0),
    productListId: row.product_list_id == null ? null : Number(row.product_list_id),
    company: String(row.company ?? ''),
    place: String(row.place ?? ''),
    area: String(row.area ?? ''),
    drawingNo: String(row.drawing_no ?? ''),
    kind: String(row.kind ?? ''),
    quantity: Number(row.quantity ?? 0),
    length: Number(row.length ?? 0),
    isCompleted: Boolean(row.is_completed),
    createdAt: String(row.created_at ?? ''),
    completedAt: String(row.completed_at ?? ''),
  }
}

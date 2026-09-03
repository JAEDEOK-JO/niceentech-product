import type { QualityListRow } from '../../types/quality'
import type {
  MainPipeCardView,
  MainPipeGroupableGroup,
  MainPipeGroupItem,
  MainPipeQuantities,
  PrintEntry,
  PrintEntryWithType,
} from '../../types/print'
import { chunkPages, formatPrintQty } from './format'

export const MAIN_PIPE_PAGE_SIZE = 6

export function hasMainPipeQuantity(row: QualityListRow): boolean {
  return Number(row.m65 ?? 0) + Number(row.m80 ?? 0) + Number(row.m100 ?? 0) + Number(row.m125 ?? 0) + Number(row.m150 ?? 0) + Number(row.m200 ?? 0) > 0
}

export function toMainPipeGroupItem(row: QualityListRow, originalIndex: number): MainPipeGroupItem {
  return {
    originalIndex,
    company: row.company ?? '',
    place: row.place ?? '',
    area: row.area ?? '',
    initial: row.initial ?? '',
    data: row,
  }
}

export function groupKeyOf(item: Pick<MainPipeGroupItem, 'company' | 'place'>): string {
  return `${item.company}_${item.place}`
}

export function buildMainPipeGroups(rows: QualityListRow[]): {
  allItems: MainPipeGroupItem[]
  groupable: MainPipeGroupableGroup[]
} {
  const allItems = rows
    .map((row, index) => toMainPipeGroupItem(row, index + 1))
    .filter((item) => hasMainPipeQuantity(item.data))

  const grouped = new Map<string, MainPipeGroupItem[]>()
  for (const item of allItems) {
    const key = groupKeyOf(item)
    const list = grouped.get(key)
    if (list) list.push(item)
    else grouped.set(key, [item])
  }

  const groupable: MainPipeGroupableGroup[] = []
  for (const [key, items] of grouped.entries()) {
    if (items.length < 2) continue
    groupable.push({
      key,
      company: items[0].company,
      place: items[0].place,
      items,
    })
  }

  return { allItems, groupable }
}

export function applyMainPipeGrouping(
  allItems: MainPipeGroupItem[],
  groupedIndices: Record<string, number[]>,
): PrintEntry[] {
  const consumed = new Set<number>()
  const entries: PrintEntry[] = []

  for (const indices of Object.values(groupedIndices)) {
    const selected = [...new Set(indices)].filter((index) =>
      allItems.some((item) => item.originalIndex === index),
    )
    if (selected.length < 2) continue

    const items = allItems.filter((item) => selected.includes(item.originalIndex))
    items.sort((a, b) => a.originalIndex - b.originalIndex)
    entries.push({
      indices: items.map((item) => item.originalIndex),
      items,
      isGrouped: true,
    })
    for (const item of items) consumed.add(item.originalIndex)
  }

  for (const item of allItems) {
    if (consumed.has(item.originalIndex)) continue
    entries.push({
      indices: [item.originalIndex],
      items: [item],
      isGrouped: false,
    })
  }

  entries.sort((a, b) => a.indices[0] - b.indices[0])
  return entries
}

export function sumMainPipeQuantities(items: MainPipeGroupItem[]): MainPipeQuantities {
  return items.reduce<MainPipeQuantities>(
    (sum, item) => {
      sum.m65 += Number(item.data.m65 ?? 0)
      sum.m80 += Number(item.data.m80 ?? 0)
      sum.m100 += Number(item.data.m100 ?? 0)
      sum.m125 += Number(item.data.m125 ?? 0)
      sum.m150 += Number(item.data.m150 ?? 0)
      sum.m200 += Number(item.data.m200 ?? 0)
      return sum
    },
    { m65: 0, m80: 0, m100: 0, m125: 0, m150: 0, m200: 0 },
  )
}

export function toMainPipeCards(entries: PrintEntry[]): PrintEntryWithType[] {
  const cards: PrintEntryWithType[] = []
  for (const entry of entries) {
    const qty = sumMainPipeQuantities(entry.items)
    if (qty.m65 > 0 || qty.m80 > 0) {
      cards.push({ entry, type: 'small' })
    }
    if (qty.m100 > 0 || qty.m125 > 0 || qty.m150 > 0 || qty.m200 > 0) {
      cards.push({ entry, type: 'large' })
    }
  }
  return cards
}

export function chunkMainPipePages(cards: PrintEntryWithType[]): PrintEntryWithType[][] {
  return chunkPages(cards, MAIN_PIPE_PAGE_SIZE)
}

export function padLotRangeValue(value: number): string {
  const num = Math.max(0, Math.trunc(Number(value) || 0))
  return String(num).padStart(5, '0')
}

export function formatMainPipeLotCode(row: QualityListRow): string {
  const lotNum = Number(row.lotNumH)
  const short = Number.isFinite(lotNum) && lotNum > 0 ? String(lotNum).slice(-3) : '---'
  const name = String(row.lotNameH ?? '').trim()
  return `(${short})${name}`
}

export function formatMainPipeLotRange(row: QualityListRow): string {
  const start = Number(row.lotNumStartH) || 0
  const end = Number(row.lotNumEndH) || 0
  if (start <= 0 && end <= 0) return ''
  return `${padLotRangeValue(start)}~${padLotRangeValue(end)}`
}

export function getMainPipeCardView(card: PrintEntryWithType): MainPipeCardView {
  const qty = sumMainPipeQuantities(card.entry.items)
  const initials = [...new Set(card.entry.items.map((item) => item.initial).filter(Boolean))]
  const areas = card.entry.items
    .map((item) => item.area.trim())
    .filter(Boolean)
  const first = card.entry.items[0]
  const lotCodes = [...new Set(card.entry.items.map((item) => formatMainPipeLotCode(item.data)).filter(Boolean))]
  const lotRanges = [...new Set(card.entry.items.map((item) => formatMainPipeLotRange(item.data)).filter(Boolean))]

  return {
    indexLabel: `${card.entry.indices.join(',')}번`,
    initial: initials.join(', '),
    companyPlace: [first?.company, first?.place].filter(Boolean).join(' '),
    area: areas.join(' / '),
    lotCode: lotCodes.join(' / '),
    lotRange: lotRanges.join('\n'),
    rows:
      card.type === 'small'
        ? [
            { label: '65A', value: formatPrintQty(qty.m65), grey: false },
            { label: '80A', value: formatPrintQty(qty.m80), grey: true },
          ]
        : [
            { label: '100A', value: formatPrintQty(qty.m100), grey: false },
            { label: '125A', value: formatPrintQty(qty.m125), grey: true },
            { label: '150A', value: formatPrintQty(qty.m150), grey: false },
            ...(qty.m200 > 0
              ? [{ label: '200A', value: formatPrintQty(qty.m200), grey: true }]
              : []),
          ],
  }
}

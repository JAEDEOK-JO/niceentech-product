import { supabase } from '@/lib/supabase'

const PRODUCT_LIST_TABLE = 'product_list'

export const parseShipmentSpecRemarks = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? ''))
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? ''))
    } catch {
      return [value]
    }
  }
  return []
}

export const remarksForBadges = (value) => (
  parseShipmentSpecRemarks(value).map((text) => text.trim()).filter(Boolean)
)

export const mergeShipmentSpecRemarks = (history, nextRemarks) => [
  ...remarksForBadges(history),
  ...remarksForBadges(nextRemarks),
]

export const hasShipmentSpecOutput = (value) => remarksForBadges(value).length > 0

export const saveShipmentSpecOutput = async (rowId, remarks, landscape) => {
  const { error } = await supabase
    .from(PRODUCT_LIST_TABLE)
    .update({
      shipment_spec_remarks: parseShipmentSpecRemarks(remarks),
      shipment_spec_landscape: Boolean(landscape),
    })
    .eq('id', rowId)

  if (error) throw error
}

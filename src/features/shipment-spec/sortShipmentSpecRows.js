import { hasShipmentSpecOutput } from './shipmentSpecOutput'

const compareText = (left, right) => (
  String(left ?? '').trim().localeCompare(String(right ?? '').trim(), 'ko', {
    numeric: true,
    sensitivity: 'base',
  })
)

export const compareShipmentSpecRows = (left, right) => {
  const leftDone = hasShipmentSpecOutput(left?.shipment_spec_remarks)
  const rightDone = hasShipmentSpecOutput(right?.shipment_spec_remarks)
  if (leftDone !== rightDone) return leftDone ? 1 : -1

  const byCompany = compareText(left?.company, right?.company)
  if (byCompany) return byCompany

  const byPlace = compareText(left?.place, right?.place)
  if (byPlace) return byPlace

  return compareText(left?.area, right?.area)
}

export const sortShipmentSpecRows = (rows) => [...(rows ?? [])].sort(compareShipmentSpecRows)

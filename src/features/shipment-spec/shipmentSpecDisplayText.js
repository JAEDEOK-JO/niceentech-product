export const shipmentSpecDisplayText = (value) => {
  const raw = String(value ?? '').trim()
  return raw || '-'
}

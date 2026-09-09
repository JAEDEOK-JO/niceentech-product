const normalizeText = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

export const matchInventoryCompany = (companies, planRow) => {
  const companyName = String(planRow?.company ?? '').trim()
  const placeName = String(planRow?.place ?? '').trim()
  const initial = String(planRow?.initial ?? '').trim()
  const list = companies ?? []

  return (
    list.find((item) => String(item.company ?? '').trim() === companyName && String(item.place ?? '').trim() === placeName)
    || list.find((item) => String(item.company ?? '').trim() === companyName && placeName && String(item.place ?? '').includes(placeName))
    || list.find((item) => companyName && String(item.company ?? '').trim() === companyName && placeName && normalizeText(item.place).includes(normalizeText(placeName)))
    || list.find((item) => companyName && String(item.company ?? '').trim() === companyName)
    || list.find((item) => initial && String(item.initial ?? '').trim() === initial)
    || null
  )
}

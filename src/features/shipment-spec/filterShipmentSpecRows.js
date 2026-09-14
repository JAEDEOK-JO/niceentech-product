export const filterShipmentSpecRows = (rows, searchText) => {
  const query = String(searchText ?? '').trim().toLowerCase()
  if (!query) return rows

  return rows.filter((row) => String(row?.initial ?? '').toLowerCase().includes(query))
}

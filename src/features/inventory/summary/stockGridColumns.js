export const stockPreviewRowCount = 5

const stockGridBreakpoints = [
  { query: '(min-width: 1280px)', columns: 6 },
  { query: '(min-width: 1024px)', columns: 5 },
  { query: '(min-width: 640px)', columns: 3 },
]

export const stockGridColumnCount = () => {
  if (typeof window === 'undefined') return 2
  for (const breakpoint of stockGridBreakpoints) {
    if (window.matchMedia(breakpoint.query).matches) return breakpoint.columns
  }
  return 2
}

import { statusClass } from '@/features/main/mainProductionPlanConfig'

export const weldingStatusLegendItems = [
  { label: '작업중', className: statusClass('작업중') },
  { label: '작업완료', className: statusClass('작업완료') },
  { label: '출하완료', className: statusClass('출하완료') },
] as const

export const formatBadgeQty = (value: unknown) => {
  const num = Number(value || 0)
  return num.toLocaleString('ko-KR')
}

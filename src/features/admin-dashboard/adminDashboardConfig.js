export const adminDashboardLinks = [
  { key: 'sales', label: '영업부', path: '/admin/sales-dashboard' },
  { key: 'design', label: '설계부', path: '/admin/design-dashboard' },
  { key: 'operations', label: '공무부', path: '/admin/operations-dashboard' },
  { key: 'production', label: '생산부', path: '/admin/production-dashboard' },
]

export const salesMetricDefinitionsSeed = [
  { metricKey: 'weekly_target_sales', label: '주간 목표 매출', valueType: 'currency', unit: '원', sortOrder: 1 },
  { metricKey: 'weekly_actual_sales', label: '주간 실매출', valueType: 'currency', unit: '원', sortOrder: 2 },
  { metricKey: 'new_order_amount', label: '신규 수주 금액', valueType: 'currency', unit: '원', sortOrder: 3 },
  { metricKey: 'new_order_count', label: '신규 수주 건수', valueType: 'number', unit: '건', sortOrder: 4 },
  { metricKey: 'non_apartment_ratio', label: '비아파트 수주 비중', valueType: 'percent', unit: '%', sortOrder: 5 },
  { metricKey: 'delivery_delay_count', label: '납기 지연 건수', valueType: 'number', unit: '건', sortOrder: 6 },
  { metricKey: 'as_issue_count', label: 'AS 발생 건수', valueType: 'number', unit: '건', sortOrder: 7 },
  { metricKey: 'weekly_note', label: '특이사항 메모', valueType: 'text', unit: '', sortOrder: 8 },
]

export const salesPrimarySummaryKeys = ['weekly_actual_sales', 'new_order_amount', 'non_apartment_ratio', 'delivery_delay_count']

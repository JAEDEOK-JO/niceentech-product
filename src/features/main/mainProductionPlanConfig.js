export const qtyColumnWidth = 60
export const statusColumnWidth = 60
export const areaColumnWidth = 300

export const tableColumns = [
  { label: '도번', key: 'initial', align: 'center', width: 85 },
  { label: '배포일', key: 'design_distributed', align: 'center', width: 55 },
  { label: '담당', key: 'name', align: 'center', width: 60 },
  { label: '회사명', key: 'company', align: 'center', width: 120 },
  { label: '현장명', key: 'place', align: 'center', width: 160 },
  { label: '구역명', key: 'area', align: 'center', width: areaColumnWidth },
  { label: '생산', key: 'worker_t', align: 'center', width: statusColumnWidth },
  { label: '나사', key: 'worker_nasa', align: 'center', width: statusColumnWidth },
  { label: '메인', key: 'worker_main', align: 'center', width: statusColumnWidth },
  { label: '용접', key: 'worker_welding', align: 'center', width: statusColumnWidth },
  { label: '헤드', key: 'head', align: 'center', width: qtyColumnWidth },
  { label: '홀', key: 'hole', align: 'center', width: qtyColumnWidth },
  { label: '그루브', key: 'groove', align: 'center', width: qtyColumnWidth },
  { label: '중량', key: 'weight', align: 'center', width: qtyColumnWidth },
  { label: '산출', key: 'estimate_status', align: 'center', width: 35 },
  { label: '비고', key: 'memo', align: 'center', width: 330 },
  { label: '도면', key: 'drawing', align: 'center', width: 35 },
]

const stageMeta = {
  marking_weld_a: { field: 'marking_weld_a_status' },
  marking_weld_b: { field: 'marking_weld_b_status' },
  marking_laser_1: { field: 'marking_laser_1_status' },
  marking_laser_2: { field: 'marking_laser_2_status' },
  nasa: { field: 'nasa_status' },
  beveling: { field: 'beveling_status' },
  main_work: { field: 'main_status' },
}

export const normalizeStageStatus = (value) => {
  const raw = String(value ?? '').trim()
  if (raw.includes('작업중')) return '작업중'
  if (raw.includes('작업완료')) return '작업완료'
  if (!raw || raw === '없음' || raw === '작업전') return '작업전'
  return raw
}

export const getCellText = (row, key) => {
  const stage = stageMeta[key]
  if (stage) return normalizeStageStatus(row?.[stage.field])
  if (key === 'design_distributed') {
    const raw = String(row?.drawing_date ?? '').trim()
    return raw
  }
  if (key === 'drawing') {
    if (Boolean(row?.drawing)) return '있음'
    return '없음'
  }
  if (key === 'estimate_status') {
    return Boolean(row?.is_drawing) ? '완료' : '전'
  }
  if ((key === 'head' || key === 'hole' || key === 'groove') && Number(row?.[key] ?? 0) === 0) return ''
  if (key === 'weight') {
    const value = Number(row?.weight ?? 0)
    return Number.isFinite(value) && value > 0 ? value.toFixed(1) : ''
  }
  return row?.[key] ?? ''
}

export const statusClass = (status) => {
  if (status === '작업완료') return 'bg-emerald-100 text-emerald-700'
  if (status === '작업중') return 'bg-amber-100 text-amber-700'
  if (status === '있음') return 'bg-sky-100 text-sky-700'
  if (status === '완료') return 'bg-emerald-100 text-emerald-700'
  return 'bg-white text-slate-500'
}

export const isStatusCompactColumn = (key) => ['worker_t', 'worker_nasa', 'worker_main', 'worker_welding'].includes(key)
export const isCompactTextColumn = (key) => ['drawing', 'estimate_status'].includes(key)

const totalTableWidth = tableColumns.reduce((sum, column) => sum + column.width, 0)

export const getColumnStyle = (column) => ({
  width: `${(column.width / totalTableWidth) * 100}%`,
})

export const getBodyCellClass = (row, column) => {
  const classes = ['border', 'border-slate-200', 'text-sm', 'text-slate-700']
  classes.push(column.align === 'center' ? 'text-center' : 'text-left')

  if (isStatusCompactColumn(column.key) || isCompactTextColumn(column.key)) {
    classes.push('px-1', 'py-[14px]', 'font-semibold')
    classes.push(statusClass(getCellText(row, column.key)))
  } else {
    classes.push('px-2', 'py-[14px]')
  }

  return classes
}

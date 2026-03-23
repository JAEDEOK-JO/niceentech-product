export const qtyColumnWidth = 60
export const statusColumnWidth = 55
export const areaColumnWidth = 300

const formatStatusDate = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const shipmentMatched = raw.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})$/)
  if (shipmentMatched) {
    const [, yy, month, day] = shipmentMatched
    return `${yy}.${month}.${day}`
  }

  const isoMatched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatched) {
    const [, , month, day] = isoMatched
    return `${month}.${day}`
  }

  const dotMatched = raw.match(/^(\d{1,2})\.(\d{1,2})$/)
  if (dotMatched) {
    const [, month, day] = dotMatched
    return `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
  }

  return raw
}

export const tableColumns = [
  { label: '도번', key: 'initial', align: 'center', width: 80 },
  { label: '배포일', key: 'design_distributed', align: 'center', width: 60 },
  { label: '도착일', key: 'delivery_due_date', align: 'center', width: 60 },
  { label: '담당', key: 'name', align: 'center', width: 60 },
  { label: '회사명', key: 'company', align: 'center', width: 120 },
  { label: '현장명', key: 'place', align: 'center', width: 170 },
  { label: '구역명', key: 'area', align: 'center', width: areaColumnWidth },
  { label: '생산', key: 'worker_t', align: 'center', width: statusColumnWidth },
  { label: '나사', key: 'worker_nasa', align: 'center', width: statusColumnWidth },
  { label: '메인', key: 'worker_main', align: 'center', width: statusColumnWidth },
  { label: '용접', key: 'worker_welding', align: 'center', width: statusColumnWidth },
  { label: '헤드', key: 'head', align: 'center', width: qtyColumnWidth },
  { label: '홀', key: 'hole', align: 'center', width: qtyColumnWidth },
  { label: '그루브', key: 'groove', align: 'center', width: qtyColumnWidth },
  { label: '중량', key: 'weight', align: 'center', width: qtyColumnWidth },
  { label: '비고', key: 'memo', align: 'center', width: 310 },
  { label: '도면', key: 'drawing', align: 'center', width: 40 },
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

const workerColumnMeta = {
  worker_t: { statusField: 'worker_t', timeField: 'worker_t_time', finalTimeField: 'worker_t_time_final' },
  worker_nasa: { statusField: 'worker_nasa', timeField: 'worker_nasa_time', finalTimeField: 'worker_nasa_time_final' },
  worker_main: { statusField: 'worker_main', timeField: 'worker_main_time', finalTimeField: 'worker_main_time_final' },
  worker_welding: { statusField: 'worker_welding', timeField: 'worker_welding_time', finalTimeField: 'worker_welding_time_final' },
}

const getWorkerDisplayInfo = (row, key) => {
  const meta = workerColumnMeta[key]
  if (!meta) return null

  const rawStatus = String(row?.[meta.statusField] ?? '').trim()
  const status = normalizeStageStatus(rawStatus)
  const finalTime = String(row?.[meta.finalTimeField] ?? '').trim()
  const completedTime = String(row?.[meta.timeField] ?? '').trim()

  if (rawStatus === '출하완료' && finalTime) {
    return { text: finalTime, tone: '출하완료' }
  }
  if (status === '작업완료' && completedTime) {
    return { text: formatStatusDate(completedTime), tone: '작업완료' }
  }
  return { text: rawStatus || '', tone: rawStatus || status || '작업전' }
}

export const getCellText = (row, key) => {
  const stage = stageMeta[key]
  if (stage) return normalizeStageStatus(row?.[stage.field])
  if (Object.hasOwn(workerColumnMeta, key)) {
    return getWorkerDisplayInfo(row, key)?.text ?? ''
  }
  if (key === 'design_distributed') {
    const raw = String(row?.drawing_date ?? '').trim()
    return raw
  }
  if (key === 'delivery_due_date') {
    return formatStatusDate(row?.delivery_due_date)
  }
  if (key === 'drawing') {
    if (Boolean(row?.is_drawing)) return '있음'
    return '없음'
  }
  if ((key === 'head' || key === 'hole' || key === 'groove') && Number(row?.[key] ?? 0) === 0) return ''
  if (key === 'weight') {
    const value = Number(row?.weight ?? 0)
    return Number.isFinite(value) && value > 0 ? value.toFixed(1) : ''
  }
  return row?.[key] ?? ''
}

export const getStatusTone = (row, key, status) => {
  if (Object.hasOwn(workerColumnMeta, key)) {
    return getWorkerDisplayInfo(row, key)?.tone ?? String(status ?? '').trim()
  }
  return String(status ?? '').trim()
}

export const statusClass = (status) => {
  if (status === '출하완료') return 'bg-red-500 text-white'
  if (status === '작업완료') return 'bg-indigo-100 text-indigo-800'
  if (status === '작업중') return 'bg-teal-100 text-teal-800'
  if (status === '작업전') return 'bg-black/10 text-slate-700'
  if (status === '없음') return 'bg-white text-slate-700'
  if (status === '있음') return 'bg-slate-200 text-slate-700'
  if (/^\d{2}\.\d{2}$/.test(String(status ?? '').trim())) return 'bg-indigo-100 text-indigo-800'
  if (/^\d{2}\.\d{1,2}\.\d{1,2}$/.test(String(status ?? '').trim())) return 'bg-red-500 text-white'
  return 'bg-transparent text-slate-700'
}

export const isStatusCompactColumn = (key) => ['worker_t', 'worker_nasa', 'worker_main', 'worker_welding'].includes(key)
export const isCompactTextColumn = (key) => ['drawing'].includes(key)

const totalTableWidth = tableColumns.reduce((sum, column) => sum + column.width, 0)

export const getColumnStyle = (column) => ({
  width: `${(column.width / totalTableWidth) * 100}%`,
})

export const getBodyCellClass = (row, column) => {
  const classes = ['border', 'border-slate-200', 'h-[50px]', 'align-middle', 'text-[13px]', 'font-medium', 'text-slate-700']
  classes.push(column.align === 'center' ? 'text-center' : 'text-left')

  if (Boolean(row?.hold)) {
    classes.push('bg-orange-100')
  } else if (isStatusCompactColumn(column.key)) {
    if (Boolean(row?.shipment)) {
      classes.push('bg-red-500', 'text-white')
    } else if (Boolean(row?.outsourcing)) {
      classes.push('bg-slate-100')
    } else {
      classes.push(statusClass(getStatusTone(row, column.key, getCellText(row, column.key))))
    }
  } else if (column.key === 'name' && Boolean(row?.calculation)) {
    classes.push('bg-lime-100')
  } else if (column.key === 'company' && String(row?.drawing_date ?? '').trim()) {
    classes.push('bg-slate-100')
  } else if (column.key === 'design_distributed' && Boolean(row?.ahn)) {
    classes.push('bg-blue-300')
  } else if (column.key === 'initial' && Boolean(row?.stamp)) {
    classes.push('bg-yellow-200')
  } else if (column.key === 'drawing' && Boolean(row?.is_drawing)) {
    classes.push('bg-orange-100', 'text-orange-800')
  } else if (column.key === 'drawing') {
    classes.push('bg-white', 'text-black')
  } else if (['initial', 'design_distributed', 'delivery_due_date'].includes(column.key) && Boolean(row?.not_test)) {
    classes.push('bg-blue-100')
  } else if (Boolean(row?.outsourcing)) {
    classes.push('bg-[#FFF2C2]')
  }

  if (isStatusCompactColumn(column.key) || isCompactTextColumn(column.key)) {
    classes.push('px-1', 'py-px', 'font-semibold')
  } else {
    classes.push('px-2', 'py-px')
  }

  return classes
}

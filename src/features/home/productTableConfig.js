export const productTableColumns = [
  { label: 'No', key: 'no', width: 30, align: 'center' },
  { label: '도번', key: 'initial', width: 70, align: 'center' },
  { label: '담당자', key: 'name', width: 60, align: 'center' },
  { label: '회사명', key: 'company', width: 110, align: 'center' },
  { label: '현장명', key: 'place', width: 180, align: 'center' },
  { label: '구역명', key: 'area', width: 330, align: 'center' },
  { label: '헤드수', key: 'head', width: 50, align: 'center' },
  { label: '홀수', key: 'hole', width: 50, align: 'center' },
  { label: '마킹1', key: 'marking_weld_a', width: 70, align: 'center' },
  { label: '마킹2', key: 'marking_weld_b', width: 70, align: 'center' },
  { label: '레이저1', key: 'marking_laser_1', width: 70, align: 'center' },
  { label: '레이저2', key: 'marking_laser_2', width: 70, align: 'center' },
  { label: '티&면치', key: 'beveling', width: 70, align: 'center' },
  { label: '메인', key: 'main_work', width: 70, align: 'center' },
  { label: '무용접', key: 'nasa', width: 70, align: 'center' },
  { label: '메뉴', key: 'call_action', width: 60, align: 'center' },
]

export const tableTotalWidth = productTableColumns.reduce((sum, c) => sum + c.width, 0)

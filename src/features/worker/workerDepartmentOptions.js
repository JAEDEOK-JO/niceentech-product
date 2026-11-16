export const WORKER_DEPARTMENTS = ['용접부', '나사부', '생산부', 'CNC']

const LEGACY_WORKER_DEPARTMENTS = {
  용접부: '용접부',
  용접: '용접부',
  치부: '용접부',
  포장: '용접부',
  페인트: '용접부',
  지게차: '용접부',
  나사부: '나사부',
  나사: '나사부',
  생산부: '생산부',
  메인관: '생산부',
  가지관: '생산부',
  CNC: 'CNC',
}

export function normalizeWorkerDepartment(value) {
  const text = String(value ?? '').trim()
  return LEGACY_WORKER_DEPARTMENTS[text] || ''
}

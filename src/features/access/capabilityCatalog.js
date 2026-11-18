export const CAPABILITY = {
  rewardReviewDenied: 'reward_review_denied',
  attendanceDeptHead: 'attendance_dept_head',
  attendanceGyeongyu: 'attendance_gyeongyu',
  attendanceFinal: 'attendance_final',
  weldingSchedule: 'welding_schedule',
  departmentDesk: 'department_desk',
  attendanceScope: 'attendance_scope',
}

export const ASSIGN_CAPABILITIES = [
  { key: CAPABILITY.rewardReviewDenied, label: '포상 제외' },
  { key: CAPABILITY.attendanceDeptHead, label: '부서장' },
  { key: CAPABILITY.attendanceGyeongyu, label: '경유' },
  { key: CAPABILITY.attendanceFinal, label: '최종' },
  { key: CAPABILITY.weldingSchedule, label: '용접일정' },
  { key: CAPABILITY.departmentDesk, label: '부서 계정' },
]

export const ATTENDANCE_SCOPE_DEPARTMENTS = ['용접부', 'CNC', '생산부', '나사부']

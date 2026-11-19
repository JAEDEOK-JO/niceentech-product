export interface AttendancePerson {
  id: string
  name: string
  department: string
  assignedDepartment: string
  remainingAnnualLeaveCount: number
  isFullTime: boolean
  hireDate: string | null
  homeLeaveStart: string | null
  homeLeaveEnd: string | null
}

import { computed, ref, watch, type Ref } from 'vue'
import {
  createAttendanceRequest,
  fetchAnnualQuota,
  fetchEmployeeAttendanceRequests,
  fetchEmployeeHomeLeaveRequests,
  fetchEmployees,
} from '@/features/attendance/services/attendance.service'
import {
  createEmptyForm,
  type AttendanceAnnualQuota,
  type AttendanceFormState,
  type AttendanceRequest,
  type Employee,
} from '@/features/attendance/types/attendance'
import { validateHomeLeaveForm } from '@/features/attendance/utils/homeLeavePolicy'

function matchEmployee(employees: Employee[], name: string, department: string) {
  const targetName = name.trim()
  const targetDepartment = department.trim()
  if (!targetName) return null
  const sameName = employees.filter((employee) => employee.name.trim() === targetName)
  const sameDepartment = sameName.find(
    (employee) =>
      employee.department.trim() === targetDepartment ||
      employee.assignedDepartment.trim() === targetDepartment,
  )
  if (sameDepartment) return sameDepartment
  return sameName.length === 1 ? sameName[0] : null
}

function profileEmployee(name: string, department: string, remainingDays: number): Employee {
  return {
    id: 0,
    employeeCode: '',
    name,
    department,
    assignedDepartment: '',
    remainingAnnualLeaveCount: remainingDays,
    hourlyWage: 0,
    isFullTime: false,
    nationality: '',
    role: '',
    hireDate: null,
    homeLeaveStart: null,
    homeLeaveEnd: null,
    password: 0,
    createdAt: '',
  }
}

export function useWorkerAttendance(source: {
  userId: Ref<string>
  name: Ref<string>
  department: Ref<string>
}) {
  const employee = ref<Employee | null>(null)
  const quota = ref<AttendanceAnnualQuota | null>(null)
  const requests = ref<AttendanceRequest[]>([])
  const loading = ref(false)
  const loadFailed = ref(false)
  const formVisible = ref(false)
  const formLoading = ref(false)
  const signatureVisible = ref(false)
  const form = ref<AttendanceFormState>(createEmptyForm())
  const toast = ref({ show: false, message: '', type: 'success' as 'success' | 'error' })
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  const applicant = computed(() => {
    if (employee.value) return employee.value
    const name = source.name.value.trim()
    if (!name) return null
    return profileEmployee(name, source.department.value.trim(), quota.value?.remainingDays ?? 0)
  })

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    if (toastTimer) clearTimeout(toastTimer)
    toast.value = { show: true, message, type }
    toastTimer = setTimeout(() => {
      toast.value.show = false
    }, 3000)
  }

  async function load() {
    const name = source.name.value.trim()
    const department = source.department.value.trim()
    if (!name) {
      employee.value = null
      quota.value = null
      requests.value = []
      return
    }
    loading.value = true
    loadFailed.value = false
    try {
      const userId = source.userId.value
      const [employees, annual] = await Promise.all([
        fetchEmployees(),
        userId ? fetchAnnualQuota(userId, new Date().getFullYear()).catch(() => null) : Promise.resolve(null),
      ])
      quota.value = annual
      employee.value = matchEmployee(employees, name, department)
      const requestName = employee.value?.name || name
      const requestDepartment = employee.value?.department || department
      requests.value = requestName && requestDepartment
        ? await fetchEmployeeAttendanceRequests(requestName, requestDepartment)
        : []
    } catch {
      employee.value = null
      quota.value = null
      requests.value = []
      loadFailed.value = true
    } finally {
      loading.value = false
    }
  }

  function openForm() {
    if (!applicant.value) return
    form.value = {
      ...createEmptyForm(),
      selectedDepartment: applicant.value.department,
      selectedEmployeeName: applicant.value.name,
    }
    formVisible.value = true
  }

  function closeForm() {
    formVisible.value = false
    signatureVisible.value = false
  }

  async function requestSubmit() {
    if (!applicant.value || !form.value.selectedEmployeeName) return
    if (form.value.leaveType === '귀국휴가') {
      try {
        const homeLeaveRequests = await fetchEmployeeHomeLeaveRequests(
          applicant.value.name,
          applicant.value.department,
        )
        const homeLeaveError = validateHomeLeaveForm({
          leaveType: form.value.leaveType,
          reason: form.value.reason,
          startDate: form.value.startDate,
          endDate: form.value.endDate,
          employee: applicant.value,
          requests: homeLeaveRequests,
        })
        if (homeLeaveError) {
          showToast(homeLeaveError, 'error')
          return
        }
      } catch {
        showToast('귀국휴가 조건을 확인하지 못했습니다.', 'error')
        return
      }
    }
    signatureVisible.value = true
  }

  async function confirmSignature(blob: Blob) {
    if (!applicant.value || !source.userId.value) return
    signatureVisible.value = false
    formLoading.value = true
    try {
      await createAttendanceRequest(
        form.value,
        source.userId.value,
        applicant.value.name,
        applicant.value.department,
        blob,
      )
      formVisible.value = false
      showToast('휴가 신청이 접수되었습니다.')
      await load()
    } catch {
      showToast('처리 중 오류가 발생했습니다.', 'error')
    } finally {
      formLoading.value = false
    }
  }

  watch([source.userId, source.name, source.department], () => {
    void load()
  }, { immediate: true })

  return {
    employee,
    applicant,
    quota,
    requests,
    loading,
    loadFailed,
    formVisible,
    formLoading,
    signatureVisible,
    form,
    toast,
    openForm,
    closeForm,
    reload: load,
    requestSubmit,
    confirmSignature,
  }
}

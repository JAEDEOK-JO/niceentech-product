<script setup lang="ts">
/**
 * AttendancePage — Controller
 * MVC:
 *  Model      → features/attendance/types/ + services/
 *  View       → features/attendance/components/AttendanceView.vue
 *  Controller → 이 파일 (상태 관리 + 서비스 호출)
 *
 * 관리자 판별: profiles.role === '관리자' (isAdminRole 사용)
 */
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDialog } from '@/composables/useDialog'
import { useAuth } from '@/composables/useAuth'
import { useProfile } from '@/composables/useProfile'
import { isAdminRole, isRootAdmin } from '@/utils/adminAccess'
import {
  fetchAttendanceRequests,
  fetchMyAttendanceRequests,
  createAttendanceRequest,
  updateAttendanceRequest,
  adminUpdateAttendanceRequest,
  deleteAttendanceRequest,
  adminDeleteAttendanceRequest,
  approveAttendanceRequest,
  rejectAttendanceRequest,
  gyeongyuAttendanceRequest,
  daepyoApproveAttendanceRequest,
  fetchAnnualQuota,
  fetchDepartments,
  fetchEmployeeCount,
  fetchEmployees,
  fetchAttendanceMonthlySummary,
  fetchApprovedAttendanceRequestsByMonth,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  fetchSignatures,
  subscribeAttendanceRequests,
  unsubscribeAttendance,
  fetchDailyWorkHoursRange,
  upsertDailyWorkHoursBulk,
  deleteDailyWorkHour,
  type EmployeeFormData,
  type SignatureInfo,
} from '@/features/attendance/services/attendance.service'
import {
  createEmptyForm,
  type AttendanceRequest,
  type AttendanceFilters,
  type AttendanceFormState,
  type AttendanceAnnualQuota,
  type AttendanceDashboardStats,
  type AttendanceMonthlySummary,
  type DailyWorkHour,
  type Employee,
} from '@/features/attendance/types/attendance'
import AttendanceView from '@/features/attendance/components/AttendanceView.vue'

// ─── Auth / Profile ────────────────────────────────────────────────────────────
const { session } = useAuth()
const { profile } = useProfile(session)

const currentUserId = computed(() => session.value?.user?.id ?? '')
const currentUserName = computed(() => profile.value?.name ?? '')
const currentDept = computed(() => profile.value?.department ?? '')

// 관리자 판별: profiles.role 컬럼 기준
const isAdmin = computed(() => isAdminRole(profile.value?.role))
const { confirm } = useDialog()
const isRootAdminUser = computed(() => isRootAdmin(profile.value?.role))

// ─── 필터 ──────────────────────────────────────────────────────────────────────
const thisYear = new Date().getFullYear()
const thisMonth = new Date().getMonth() + 1
const filters = reactive<AttendanceFilters>({
  year: thisYear,
  month: thisMonth,
  department: '',
  status: '',
  searchQuery: '',
})

// ─── 신청 목록 상태 ────────────────────────────────────────────────────────────
const items = ref<AttendanceRequest[]>([])
const departments = ref<string[]>([])
const quota = ref<AttendanceAnnualQuota | null>(null)
const employeeCount = ref(0)
const loading = ref(false)

const stats = computed<AttendanceDashboardStats>(() => {
  const ym = `${thisYear}-${String(thisMonth).padStart(2, '0')}`
  return {
    employeeCount: employeeCount.value,
    thisMonthTotal: items.value.filter((i) => i.startDate.startsWith(ym)).length,
    pendingCount: items.value.filter((i) => i.status === '대기중').length,
    approvedCount: items.value.filter((i) => i.status === '승인').length,
    myRemainingDays: quota.value?.remainingDays ?? 0,
  }
})

// ─── 직원 목록 상태 ────────────────────────────────────────────────────────────
const employees = ref<Employee[]>([])
const employeesLoading = ref(false)

// ─── 작업시간 상태 ───────────────────────────────────────────────────────────
function formatLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthRange(value: string) {
  const base = new Date(`${value}T00:00:00`)
  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  }
}

const dailyWorkDate = ref(formatLocalDate())
const dailyWorkHours = ref<DailyWorkHour[]>([])
const dailyWorkRequests = ref<AttendanceRequest[]>([])
const dailyWorkHoursLoading = ref(false)

function upsertLocalDailyWorkHours(records: { workDate: string; employeeId: number; endTime: string }[]) {
  const updatedAt = new Date().toISOString()
  const next = [...dailyWorkHours.value]

  for (const record of records) {
    const index = next.findIndex((item) => item.workDate === record.workDate && item.employeeId === record.employeeId)
    const current = index >= 0 ? next[index] : null
    const item: DailyWorkHour = {
      id: current?.id ?? 0,
      workDate: record.workDate,
      employeeId: record.employeeId,
      endTime: record.endTime,
      createdAt: current?.createdAt ?? updatedAt,
      updatedAt,
    }

    if (index >= 0) {
      next.splice(index, 1, item)
    } else {
      next.push(item)
    }
  }

  dailyWorkHours.value = next
}

async function loadDailyWorkHours({ silent = false } = {}) {
  if (!silent) dailyWorkHoursLoading.value = true
  try {
    const { startDate, endDate } = getMonthRange(dailyWorkDate.value)
    dailyWorkHours.value = await fetchDailyWorkHoursRange(startDate, endDate)
  } catch (err) {
    console.error('[loadDailyWorkHours]', err)
    dailyWorkHours.value = []
    showToast('작업시간을 불러오지 못했습니다.', 'error')
  } finally {
    if (!silent) dailyWorkHoursLoading.value = false
  }
}

async function loadDailyWorkRequests() {
  const target = new Date(`${dailyWorkDate.value}T00:00:00`)
  try {
    dailyWorkRequests.value = await fetchAttendanceRequests({
      year: target.getFullYear(),
      month: target.getMonth() + 1,
      department: '',
      status: '',
      searchQuery: '',
    })
  } catch {
    dailyWorkRequests.value = []
  }
}

async function handleSaveDailyWorkHours(records: { employeeId: number; endTime: string }[]) {
  if (records.length === 0) return
  try {
    const payload = records.map((r) => ({ workDate: dailyWorkDate.value, employeeId: r.employeeId, endTime: r.endTime }))
    await upsertDailyWorkHoursBulk(payload)
    await loadDailyWorkHours({ silent: true })
    showToast(`${records.length}명 저장되었습니다.`)
  } catch (err) {
    console.error('[handleSaveDailyWorkHours]', err)
    showToast('저장 중 오류가 발생했습니다.', 'error')
  }
}

async function handleDeleteDailyWorkHour(payload: { workDate: string; employeeId: number }) {
  try {
    await deleteDailyWorkHour(payload.workDate, payload.employeeId)
    dailyWorkHours.value = dailyWorkHours.value.filter(
      (item) => !(item.workDate === payload.workDate && item.employeeId === payload.employeeId),
    )
  } catch {
    showToast('삭제 중 오류가 발생했습니다.', 'error')
  }
}

async function handleDeleteDailyWorkHoursBulk(payload: { workDate: string; employeeIds: number[] }) {
  if (payload.employeeIds.length === 0) return
  try {
    await Promise.all(payload.employeeIds.map((employeeId) => deleteDailyWorkHour(payload.workDate, employeeId)))
    const ids = new Set(payload.employeeIds)
    dailyWorkHours.value = dailyWorkHours.value.filter(
      (item) => !(item.workDate === payload.workDate && ids.has(item.employeeId)),
    )
    showToast(`${payload.employeeIds.length}명 삭제되었습니다.`)
  } catch {
    showToast('일괄삭제 중 오류가 발생했습니다.', 'error')
  }
}

async function handleUpdateDailyWorkHour(payload: { workDate: string; employeeId: number; endTime: string }) {
  try {
    await upsertDailyWorkHoursBulk([payload])
    await loadDailyWorkHours({ silent: true })
    showToast('작업시간이 수정되었습니다.')
  } catch (err) {
    console.error('[handleUpdateDailyWorkHour]', err)
    showToast('수정 중 오류가 발생했습니다.', 'error')
  }
}

async function setDailyWorkDate(workDate: string) {
  const currentRange = getMonthRange(dailyWorkDate.value)
  const nextRange = getMonthRange(workDate)
  dailyWorkDate.value = workDate
  if (currentRange.startDate !== nextRange.startDate || currentRange.endDate !== nextRange.endDate) {
    await Promise.all([loadDailyWorkHours({ silent: true }), loadDailyWorkRequests()])
  }
}

// ─── 근태요약 상태 ──────────────────────────────────────────────────────────────
const summaryYear = ref(thisYear)
const summaryMonth = ref(thisMonth)
const summaryLoading = ref(false)
const monthlySummaries = ref<AttendanceMonthlySummary[]>([])
const monthlySummaryRequests = ref<AttendanceRequest[]>([])
const summaryDetailVisible = ref(false)
const summaryDetailUserName = ref('')
const summaryDetailDepartment = ref('')
const summaryDetailRequests = ref<AttendanceRequest[]>([])

// ─── 신청 폼 상태 ──────────────────────────────────────────────────────────────
const formVisible = ref(false)
const formLoading = ref(false)
const isEditForm = ref(false)
const editTargetId = ref<number | null>(null)
const formData = ref<AttendanceFormState>(createEmptyForm())
const hideFormEmployeeSelector = ref(false)

// ─── 서명 다이얼로그 상태 ──────────────────────────────────────────────────────
const signatureRequestVisible = ref(false)

// ─── 디테일 모달 ───────────────────────────────────────────────────────────────
const detailItem = ref<AttendanceRequest | null>(null)
const detailSignatures = ref<SignatureInfo[]>([])
const SIGNATURE_NAMES = ['쩌민튼', 'duko777@niceentech.kr'] as const

async function openDetail(item: AttendanceRequest) {
  detailItem.value = item
  try {
    const names = [...SIGNATURE_NAMES]
    if (item.gyeongyuBy && !names.includes(item.gyeongyuBy as typeof names[number])) {
      (names as string[]).push(item.gyeongyuBy)
    }
    detailSignatures.value = await fetchSignatures(names)
  } catch {
    detailSignatures.value = SIGNATURE_NAMES.map((name) => ({ name, signaturePath: null }))
  }
}

function closeDetail() {
  detailItem.value = null
  detailSignatures.value = []
}

// ─── 반려 다이얼로그 ───────────────────────────────────────────────────────────
const rejectDialogVisible = ref(false)
const rejectTarget = ref<AttendanceRequest | null>(null)
const rejectReason = ref('')

// ─── 토스트 ────────────────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' as 'success' | 'error' })
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.show = true
  toast.message = message
  toast.type = type
  toastTimer = setTimeout(() => { toast.show = false }, 3000)
}

// ─── 데이터 로드 ───────────────────────────────────────────────────────────────
async function loadItems({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    // 관리자: 필터 적용 전체, 일반: 전체 목록(필터 없이) 조회
    if (isAdmin.value) {
      items.value = await fetchAttendanceRequests({ ...filters })
    } else {
      items.value = await fetchAttendanceRequests({ ...filters, searchQuery: '' })
    }
  } catch {
    showToast('목록을 불러오지 못했습니다.', 'error')
  } finally {
    if (!silent) loading.value = false
  }
}

async function loadQuota() {
  if (!currentUserId.value) return
  try {
    quota.value = await fetchAnnualQuota(currentUserId.value, filters.year)
  } catch {
    quota.value = null
  }
}

async function loadMeta() {
  try {
    const [depts, count] = await Promise.all([fetchDepartments(), fetchEmployeeCount()])
    departments.value = depts
    employeeCount.value = count
  } catch { /* non-critical */ }
}

async function loadEmployees() {
  employeesLoading.value = true
  try {
    employees.value = await fetchEmployees()
  } catch {
    employees.value = []
  } finally {
    employeesLoading.value = false
  }
}

async function loadMonthlySummary({ silent = false } = {}) {
  if (!isAdmin.value) {
    monthlySummaries.value = []
    monthlySummaryRequests.value = []
    return
  }

  if (!silent) summaryLoading.value = true
  try {
    const [summaries, requests] = await Promise.all([
      fetchAttendanceMonthlySummary(summaryYear.value, summaryMonth.value),
      fetchApprovedAttendanceRequestsByMonth(summaryYear.value, summaryMonth.value),
    ])
    monthlySummaries.value = summaries
    monthlySummaryRequests.value = requests
  } catch {
    monthlySummaries.value = []
    monthlySummaryRequests.value = []
    showToast('근태요약을 불러오지 못했습니다.', 'error')
  } finally {
    if (!silent) summaryLoading.value = false
  }
}

let suppressRealtimeRefreshUntil = 0

function markLocalAttendanceMutation() {
  suppressRealtimeRefreshUntil = Date.now() + 1500
}

async function refreshAttendanceAfterMutation() {
  await Promise.all([loadItems({ silent: true }), loadQuota(), loadMonthlySummary({ silent: true }), loadDailyWorkRequests()])
}

function openSummaryDetail(summary: AttendanceMonthlySummary) {
  summaryDetailUserName.value = summary.userName
  summaryDetailDepartment.value = summary.department
  summaryDetailRequests.value = monthlySummaryRequests.value.filter(
    (item) => item.userName === summary.userName && item.department === summary.department,
  )
  summaryDetailVisible.value = true
}

function closeSummaryDetail() {
  summaryDetailVisible.value = false
  summaryDetailUserName.value = ''
  summaryDetailDepartment.value = ''
  summaryDetailRequests.value = []
}

async function openSummaryRequestDetail(item: AttendanceRequest) {
  closeSummaryDetail()
  await openDetail(item)
}

watch(() => ({ ...filters }), () => {
  void loadItems()
  void loadQuota()
}, { deep: true })

watch([summaryYear, summaryMonth, isAdmin], () => {
  void loadMonthlySummary()
})

watch(() => profile.value, async (p) => {
  if (!p) return
  await Promise.all([loadItems(), loadQuota(), loadMeta(), loadEmployees(), loadMonthlySummary(), loadDailyWorkHours(), loadDailyWorkRequests()])
}, { immediate: true })

// ─── 실시간 구독 ───────────────────────────────────────────────────────────────
let channel: ReturnType<typeof subscribeAttendanceRequests> | null = null

onMounted(() => {
  channel = subscribeAttendanceRequests(() => {
    if (Date.now() < suppressRealtimeRefreshUntil) return
    void loadItems({ silent: true })
    void loadQuota()
    void loadMonthlySummary({ silent: true })
    void loadDailyWorkRequests()
  })
})

onUnmounted(() => {
  if (channel) unsubscribeAttendance(channel)
  if (toastTimer) clearTimeout(toastTimer)
})

// ─── 신청 폼 ────────────────────────────────────────────────────────────────────
function openForm() {
  formData.value = createEmptyForm()
  isEditForm.value = false
  editTargetId.value = null
  hideFormEmployeeSelector.value = false
  formVisible.value = true
}

function openFormForEmployee(emp: Employee) {
  formData.value = {
    ...createEmptyForm(),
    selectedDepartment: emp.department,
    selectedEmployeeName: emp.name,
  }
  isEditForm.value = false
  editTargetId.value = null
  hideFormEmployeeSelector.value = true
  formVisible.value = true
}

function closeForm() {
  formVisible.value = false
}

function openEditForm(item: AttendanceRequest) {
  formData.value = {
    selectedDepartment: item.department,
    selectedEmployeeName: item.userName,
    leaveType: item.leaveType as AttendanceFormState['leaveType'],
    startDate: item.startDate,
    endDate: item.endDate,
    daysCount: item.daysCount,
    reason: item.reason,
  }
  isEditForm.value = true
  editTargetId.value = item.id
  hideFormEmployeeSelector.value = false
  formVisible.value = true
}

async function submitForm() {
  if (!formData.value.selectedEmployeeName) {
    showToast('직원을 선택해주세요.', 'error')
    return
  }

  // 수정은 서명 없이 바로 처리
  if (isEditForm.value && editTargetId.value !== null) {
    formLoading.value = true
    try {
      if (isAdmin.value) {
        await adminUpdateAttendanceRequest(editTargetId.value, formData.value)
      } else {
        await updateAttendanceRequest(editTargetId.value, formData.value)
      }
      showToast('수정되었습니다.')
      markLocalAttendanceMutation()
      formVisible.value = false
      await refreshAttendanceAfterMutation()
    } catch {
      showToast('처리 중 오류가 발생했습니다.', 'error')
    } finally {
      formLoading.value = false
    }
    return
  }

  // 신규 신청 → 서명 다이얼로그 표시
  signatureRequestVisible.value = true
}

async function handleSignatureConfirm(blob: Blob) {
  signatureRequestVisible.value = false
  formLoading.value = true
  try {
    await createAttendanceRequest(
      formData.value,
      currentUserId.value,
      formData.value.selectedEmployeeName,
      formData.value.selectedDepartment,
      blob,
    )
    showToast('휴가 신청이 접수되었습니다.')
    markLocalAttendanceMutation()
    formVisible.value = false
    await refreshAttendanceAfterMutation()
  } catch {
    showToast('처리 중 오류가 발생했습니다.', 'error')
  } finally {
    formLoading.value = false
  }
}

function handleSignatureCancel() {
  signatureRequestVisible.value = false
}

// ─── 신청 삭제 (일반 사용자, 대기중만) ────────────────────────────────────────
async function handleDelete(item: AttendanceRequest) {
  if (!await confirm('신청을 취소하시겠습니까?')) return
  try {
    await deleteAttendanceRequest(item.id)
    markLocalAttendanceMutation()
    showToast('취소되었습니다.')
    await refreshAttendanceAfterMutation()
  } catch {
    showToast('취소 중 오류가 발생했습니다.', 'error')
  }
}

// ─── 관리자 수정 ───────────────────────────────────────────────────────────────
function handleAdminEdit(item: AttendanceRequest) {
  if (item.status === '승인') {
    showToast('승인 완료 건은 수정할 수 없습니다.', 'error')
    return
  }
  formData.value = {
    selectedDepartment: item.department,
    selectedEmployeeName: item.userName,
    leaveType: item.leaveType as AttendanceFormState['leaveType'],
    startDate: item.startDate,
    endDate: item.endDate,
    daysCount: item.daysCount,
    reason: item.reason,
  }
  isEditForm.value = true
  editTargetId.value = item.id
  hideFormEmployeeSelector.value = false
  formVisible.value = true
}

// ─── 관리자 삭제 (상태 무관) ───────────────────────────────────────────────────
async function handleAdminDelete(item: AttendanceRequest) {
  if (item.status === '승인' && !isRootAdminUser.value) {
    showToast('승인 완료 건은 삭제할 수 없습니다.', 'error')
    return
  }
  if (!await confirm(`'${item.userName}' 신청을 삭제하시겠습니까?`)) return
  try {
    await adminDeleteAttendanceRequest(item.id)
    markLocalAttendanceMutation()
    showToast('삭제되었습니다.')
    await refreshAttendanceAfterMutation()
  } catch {
    showToast('삭제 중 오류가 발생했습니다.', 'error')
  }
}

// ─── 대표 최종 승인 ────────────────────────────────────────────────────────────
async function handleDaepyoApprove(item: AttendanceRequest) {
  if (!await confirm(`${item.userName}의 신청을 최종 승인하시겠습니까?`)) return
  try {
    await daepyoApproveAttendanceRequest(item.id, '이용필')
    markLocalAttendanceMutation()
    showToast('최종 승인 처리되었습니다.')
    await refreshAttendanceAfterMutation()
  } catch {
    showToast('최종 승인 중 오류가 발생했습니다.', 'error')
  }
}

// ─── 경유 ──────────────────────────────────────────────────────────────────────
async function handleGyeongyu(item: AttendanceRequest) {
  if (!await confirm(`${item.userName}의 신청을 경유 처리하시겠습니까?`)) return
  try {
    await gyeongyuAttendanceRequest(item.id, currentUserName.value)
    markLocalAttendanceMutation()
    showToast('경유 처리되었습니다.')
    await refreshAttendanceAfterMutation()
  } catch {
    showToast('경유 처리 중 오류가 발생했습니다.', 'error')
  }
}

// ─── 승인 ──────────────────────────────────────────────────────────────────────
async function handleApprove(item: AttendanceRequest) {
  if (!await confirm(`${item.userName}의 신청을 승인하시겠습니까?`)) return
  try {
    await approveAttendanceRequest(item.id, currentUserName.value)
    markLocalAttendanceMutation()
    showToast('승인 처리되었습니다.')
    await refreshAttendanceAfterMutation()
  } catch {
    showToast('승인 중 오류가 발생했습니다.', 'error')
  }
}

// ─── 반려 ──────────────────────────────────────────────────────────────────────
function openRejectDialog(item: AttendanceRequest) {
  rejectTarget.value = item
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

function closeRejectDialog() {
  rejectDialogVisible.value = false
  rejectTarget.value = null
  rejectReason.value = ''
}

async function submitReject() {
  if (!rejectTarget.value) return
  if (!rejectReason.value.trim()) {
    showToast('반려 사유를 입력해주세요.', 'error')
    return
  }
  try {
    await rejectAttendanceRequest(rejectTarget.value.id, currentUserName.value, rejectReason.value.trim())
    markLocalAttendanceMutation()
    showToast('반려 처리되었습니다.')
    closeRejectDialog()
    await refreshAttendanceAfterMutation()
  } catch {
    showToast('반려 처리 중 오류가 발생했습니다.', 'error')
  }
}

// ─── 직원 CRUD ─────────────────────────────────────────────────────────────────
async function handleCreateEmployee(data: EmployeeFormData) {
  try {
    await createEmployee(data)
    showToast('직원이 등록되었습니다.')
    await Promise.all([loadEmployees(), loadMeta()])
  } catch {
    showToast('등록 중 오류가 발생했습니다.', 'error')
  }
}

async function handleUpdateEmployee(payload: { id: number; data: EmployeeFormData }) {
  try {
    await updateEmployee(payload.id, payload.data)
    showToast('직원 정보가 수정되었습니다.')
    await loadEmployees()
  } catch {
    showToast('수정 중 오류가 발생했습니다.', 'error')
  }
}

async function handleDeleteEmployee(id: number) {
  try {
    await deleteEmployee(id)
    showToast('직원이 삭제되었습니다.')
    await Promise.all([loadEmployees(), loadMeta()])
  } catch {
    showToast('삭제 중 오류가 발생했습니다.', 'error')
  }
}
</script>

<template>
  <AttendanceView
    :items="items"
    :filters="filters"
    :departments="departments"
    :quota="quota"
    :stats="stats"
    :employees="employees"
    :employees-loading="employeesLoading"
    :summary-year="summaryYear"
    :summary-month="summaryMonth"
    :summary-loading="summaryLoading"
    :monthly-summaries="monthlySummaries"
    :summary-detail-visible="summaryDetailVisible"
    :summary-detail-user-name="summaryDetailUserName"
    :summary-detail-department="summaryDetailDepartment"
    :summary-detail-requests="summaryDetailRequests"
    :current-user-id="currentUserId"
    :is-admin="isAdmin"
    :is-root-admin="isRootAdminUser"
    :approval-pending-count="items.filter(i => i.status === '대기중').length"
    :daepyo-pending-count="items.filter(i => i.status === '부서장승인').length"
    :gyeongyu-pending-count="items.filter(i => !i.gyeongyuBy).length"
    :loading="loading"
    :form-visible="formVisible"
    :form-loading="formLoading"
    :form-data="formData"
    :is-edit-form="isEditForm"
    :hide-form-employee-selector="hideFormEmployeeSelector"
    :toast="toast"
    :reject-dialog-visible="rejectDialogVisible"
    :reject-target="rejectTarget"
    :reject-reason="rejectReason"
    @update:filters="Object.assign(filters, $event)"
    @update:summary-year="summaryYear = $event"
    @update:summary-month="summaryMonth = $event"
    @update:form-data="formData = $event"
    @update:reject-reason="rejectReason = $event"
    @open-summary-detail="openSummaryDetail"
    @close-summary-detail="closeSummaryDetail"
    @open-summary-request-detail="openSummaryRequestDetail"
    @open-form="openForm"
    @close-form="closeForm"
    @submit-form="submitForm"
    @edit="openEditForm"
    @delete="handleDelete"
    @approve="handleApprove"
    @daepyo-approve="handleDaepyoApprove"
    @gyeongyu="handleGyeongyu"
    @open-reject="openRejectDialog"
    @close-reject="closeRejectDialog"
    @submit-reject="submitReject"
    @admin-edit="handleAdminEdit"
    @admin-delete="handleAdminDelete"
    :signature-request-visible="signatureRequestVisible"
    @signature-confirm="handleSignatureConfirm"
    @signature-cancel="handleSignatureCancel"
    :detail-item="detailItem"
    :detail-signatures="detailSignatures"
    @open-detail="openDetail"
    @close-detail="closeDetail"
    @create-employee="handleCreateEmployee"
    @update-employee="handleUpdateEmployee"
    @delete-employee="handleDeleteEmployee"
    @open-form-for-employee="openFormForEmployee"
    :today-work-date="dailyWorkDate"
    :daily-work-hours="dailyWorkHours"
    :daily-work-requests="dailyWorkRequests"
    :daily-work-hours-loading="dailyWorkHoursLoading"
    @save-daily-work-hours="handleSaveDailyWorkHours"
    @refresh-daily-work-hours="loadDailyWorkHours"
    @delete-daily-work-hour="handleDeleteDailyWorkHour"
    @delete-daily-work-hours-bulk="handleDeleteDailyWorkHoursBulk"
    @update-daily-work-hour="handleUpdateDailyWorkHour"
    @select-daily-work-date="setDailyWorkDate"
  />
</template>

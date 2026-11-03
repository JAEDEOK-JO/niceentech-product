<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AttendanceForm from '../components/AttendanceForm.vue'
import AttendanceRequestSignatureDialog from '../components/AttendanceRequestSignatureDialog.vue'
import { createEmptyForm, type AttendanceFormState, type Employee } from '../types/attendance'
import { encodeEvidenceImage } from './encodeEvidenceImage'
import { readGuestLink, type GuestLink } from './guestLink'
import { loadGuestEmployees } from './loadGuestEmployees'
import { submitGuestRequest } from './submitGuestRequest'

const props = defineProps<{
  token: string
}>()

const DEPT_ORDER = ['생산부', '용접부', '나사부', 'CNC', '지게차']

const link = ref<GuestLink | null>(null)
const linkReady = ref(false)
const employees = ref<Employee[]>([])
const loadingEmployees = ref(false)
const loadError = ref('')
const selectedDepartment = ref('')
const formVisible = ref(false)
const formLoading = ref(false)
const formData = ref<AttendanceFormState>(createEmptyForm())
const signatureVisible = ref(false)
const toast = ref<{ show: boolean; message: string; type: 'success' | 'error' }>({
  show: false,
  message: '',
  type: 'success',
})
const submitted = ref(false)
let timer = 0
let toastTimer = 0

const expired = computed(() => linkReady.value && !link.value)
const departments = computed(() => {
  const names = new Set(employees.value.map((employee) => employee.department).filter(Boolean))
  const ordered = DEPT_ORDER.filter((department) => names.has(department))
  const extras = [...names].filter((department) => !DEPT_ORDER.includes(department)).sort()
  return [...ordered, ...extras]
})
const directoryEmployees = computed(() =>
  selectedDepartment.value
    ? employees.value
        .filter((employee) => employee.department === selectedDepartment.value)
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
    : [],
)

function showToast(message: string, type: 'success' | 'error' = 'success') {
  window.clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = window.setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

async function refreshLink() {
  link.value = await readGuestLink(props.token)
  linkReady.value = true
}

function openForm(employee: Employee) {
  if (!link.value) return
  formData.value = {
    ...createEmptyForm(),
    selectedDepartment: employee.department,
    selectedEmployeeName: employee.name,
  }
  formVisible.value = true
}

function closeForm() {
  formVisible.value = false
  signatureVisible.value = false
}

async function confirmSignature(blob: Blob) {
  if (!link.value) {
    showToast('사용할 수 없습니다.', 'error')
    return
  }
  signatureVisible.value = false
  formLoading.value = true
  try {
    const current = await readGuestLink(props.token)
    if (!current) {
      link.value = null
      showToast('사용할 수 없습니다.', 'error')
      return
    }
    const signatureUrl = await encodeEvidenceImage(blob)
    await submitGuestRequest(current.userId, formData.value, signatureUrl)
    submitted.value = true
    formVisible.value = false
    showToast('휴가 신청이 접수되었습니다.')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '저장하지 못했습니다.', 'error')
  } finally {
    formLoading.value = false
  }
}

watch(link, (value) => {
  if (linkReady.value && !value) {
    formVisible.value = false
    signatureVisible.value = false
  }
})

onMounted(async () => {
  await refreshLink()
  if (!link.value) return
  loadingEmployees.value = true
  try {
    employees.value = await loadGuestEmployees()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '직원 명단을 불러오지 못했습니다.'
  } finally {
    loadingEmployees.value = false
  }
  timer = window.setInterval(() => {
    void refreshLink()
  }, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  window.clearTimeout(toastTimer)
})
</script>

<template>
  <div class="h-dvh overflow-y-auto overscroll-y-contain bg-slate-50">
    <div class="mx-auto w-full max-w-5xl px-4 py-5">
      <h1 class="text-2xl font-extrabold text-slate-900">휴가 신청</h1>

      <div v-if="!linkReady" class="py-20 text-center text-sm font-bold text-slate-400">불러오는 중</div>
      <div v-else-if="expired" class="mt-8 rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm font-bold text-slate-500">
        사용할 수 없습니다
      </div>
      <div v-else-if="submitted" class="mt-8 rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm font-bold text-slate-700">
        휴가 신청이 접수되었습니다
      </div>
      <p v-else-if="loadError" class="mt-6 text-sm font-bold text-red-500">{{ loadError }}</p>
      <div v-else class="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-base font-extrabold text-slate-800">
            {{ selectedDepartment ? `${selectedDepartment} 직원 명단` : '직원 명단' }}
          </h2>
          <button
            v-if="selectedDepartment"
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
            @click="selectedDepartment = ''"
          >
            돌아가기
          </button>
        </div>

        <div v-if="loadingEmployees" class="py-12 text-center text-sm font-bold text-slate-400">불러오는 중</div>
        <div v-else-if="!selectedDepartment" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            v-for="department in departments"
            :key="department"
            type="button"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-base font-extrabold text-slate-800"
            @click="selectedDepartment = department"
          >
            {{ department }}
          </button>
        </div>
        <div v-else-if="directoryEmployees.length === 0" class="py-12 text-center text-sm text-slate-400">
          해당 부서에 등록된 직원이 없습니다.
        </div>
        <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button
            v-for="employee in directoryEmployees"
            :key="employee.id"
            type="button"
            class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center"
            @click="openForm(employee)"
          >
            <p class="truncate text-sm font-extrabold text-slate-900">{{ employee.name }}</p>
            <p class="mt-1 text-[11px] font-bold text-slate-500">{{ employee.assignedDepartment || employee.department }}</p>
          </button>
        </div>
      </div>
    </div>

    <div v-if="formVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 class="mb-5 text-lg font-extrabold text-slate-900">휴가 신청</h2>
        <AttendanceForm
          :model-value="formData"
          :loading="formLoading"
          :is-edit="false"
          :employees="employees"
          hide-employee-selector
          local-evidence
          :show-request-history="false"
          upload-user-id="guest"
          @update:model-value="formData = $event"
          @submit="signatureVisible = true"
          @cancel="closeForm"
        />
      </div>
    </div>

    <AttendanceRequestSignatureDialog
      v-if="signatureVisible"
      @confirm="confirmSignature"
      @cancel="signatureVisible = false"
    />

    <div
      v-if="toast.show"
      class="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg"
      :class="toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

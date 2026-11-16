<script setup>
import { onMounted, ref } from 'vue'
import { useDialog } from '@/composables/useDialog'
import { fetchEmployeeOptionGroups } from '@/features/attendance/services/employeeOptions.service'
import WorkerSignupRow from './WorkerSignupRow.vue'
import { approveWorkerSignup, deleteWorkerSignup, fetchWorkerSignups, updateWorkerSignup } from './workerSignup.service'

const { confirm } = useDialog()
const items = ref([])
const departments = ref([])
const loading = ref(false)
const savingId = ref('')
const message = ref('')

function loginId(email) {
  return String(email ?? '').replace(/@niceentech\.kr$/i, '')
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    const [rows, options] = await Promise.all([
      fetchWorkerSignups(),
      fetchEmployeeOptionGroups().catch(() => ({ assignedDepartments: [] })),
    ])
    items.value = rows
    departments.value = options.assignedDepartments
  } catch {
    items.value = []
    message.value = '불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function handleApprove(item) {
  if (savingId.value || item.activate) return
  savingId.value = item.id
  message.value = ''
  const result = await approveWorkerSignup(item.id)
  savingId.value = ''
  if (!result.ok) {
    message.value = result.message
    return
  }
  item.activate = true
}

async function handleSave(payload) {
  if (savingId.value) return
  if (!payload.name) {
    message.value = '이름을 입력해 주세요.'
    return
  }
  savingId.value = payload.id
  message.value = ''
  const result = await updateWorkerSignup(payload.id, payload)
  savingId.value = ''
  if (!result.ok) {
    message.value = result.message
    return
  }
  const item = items.value.find((row) => row.id === payload.id)
  if (!item) return
  item.name = result.item.name
  item.assigned_department = result.item.assigned_department
}

async function handleRemove(item) {
  if (savingId.value) return
  const ok = await confirm(`${loginId(item.email) || item.name} 아이디를 삭제할까요?`, { confirmText: '삭제' })
  if (!ok) return
  savingId.value = item.id
  message.value = ''
  const result = await deleteWorkerSignup(item.id)
  savingId.value = ''
  if (!result.ok) {
    message.value = result.message
    return
  }
  items.value = items.value.filter((row) => row.id !== item.id)
}

onMounted(load)
</script>

<template>
  <section>
    <p v-if="loading" class="py-14 text-center text-sm text-slate-400">불러오는 중...</p>
    <template v-else>
      <p v-if="message" class="mb-3 text-center text-sm font-bold text-red-500">{{ message }}</p>
      <p v-if="items.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">없음</p>
      <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="min-w-full border-collapse text-sm">
          <thead>
            <tr class="bg-slate-50 text-center text-xs font-bold text-slate-500">
              <th class="border border-slate-200 px-4 py-3">이름</th>
              <th class="border border-slate-200 px-4 py-3">담당</th>
              <th class="border border-slate-200 px-4 py-3">아이디</th>
              <th class="border border-slate-200 px-4 py-3">가입일</th>
              <th class="border border-slate-200 px-4 py-3">상태</th>
              <th class="border border-slate-200 px-4 py-3">처리</th>
            </tr>
          </thead>
          <tbody>
            <WorkerSignupRow
              v-for="item in items"
              :key="item.id"
              :item="item"
              :departments="departments"
              :saving="savingId === item.id"
              @approve="handleApprove"
              @save="handleSave"
              @remove="handleRemove"
            />
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { approveWorker, fetchWorkerSignups } from './workerSignup.service'

const items = ref([])
const loading = ref(false)
const savingId = ref('')
const message = ref('')

function loginId(email) {
  return String(email ?? '').replace(/@niceentech\.kr$/i, '')
}

function joinedAt(value) {
  const text = String(value ?? '')
  return text.length >= 10 ? text.slice(0, 10) : '-'
}

async function load() {
  loading.value = true
  message.value = ''
  try {
    items.value = await fetchWorkerSignups()
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
  const result = await approveWorker(item.id)
  savingId.value = ''
  if (!result.ok) {
    message.value = result.message
    return
  }
  item.activate = true
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
          <tr v-for="item in items" :key="item.id">
            <td class="border border-slate-200 px-4 py-3 text-center font-extrabold text-slate-900">{{ item.name }}</td>
            <td class="border border-slate-200 px-4 py-3 text-center text-slate-600">{{ item.assigned_department || '-' }}</td>
            <td class="border border-slate-200 px-4 py-3 text-center text-slate-600">{{ loginId(item.email) || '-' }}</td>
            <td class="border border-slate-200 px-4 py-3 text-center text-slate-600">{{ joinedAt(item.created_at) }}</td>
            <td class="border border-slate-200 px-4 py-3 text-center">
              <span
                class="rounded-full px-2.5 py-1 text-[11px] font-bold"
                :class="item.activate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
              >
                {{ item.activate ? '승인' : '대기' }}
              </span>
            </td>
            <td class="border border-slate-200 px-4 py-3 text-center">
              <button
                v-if="!item.activate"
                type="button"
                class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-40"
                :disabled="savingId === item.id"
                @click="handleApprove(item)"
              >
                승인
              </button>
              <span v-else class="text-xs text-slate-300">-</span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </template>
  </section>
</template>

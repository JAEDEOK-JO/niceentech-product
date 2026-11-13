<script setup>
import { onMounted, ref } from 'vue'
import { approveWorker, fetchPendingWorkers } from '../services/workerApproval.service'

const items = ref([])
const loading = ref(false)
const savingId = ref('')
const message = ref('')

async function load() {
  loading.value = true
  message.value = ''
  try {
    items.value = await fetchPendingWorkers()
  } catch {
    items.value = []
    message.value = '불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function handleApprove(id) {
  if (savingId.value) return
  savingId.value = id
  message.value = ''
  const result = await approveWorker(id)
  savingId.value = ''
  if (!result.ok) {
    message.value = result.message
    return
  }
  items.value = items.value.filter((item) => item.id !== id)
}

onMounted(load)
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-extrabold text-slate-900">가입승인</h2>

    <p v-if="loading" class="mt-6 text-sm font-bold text-slate-500">불러오는 중...</p>
    <p v-else-if="message" class="mt-6 text-sm font-bold text-red-500">{{ message }}</p>
    <p v-else-if="items.length === 0" class="mt-6 text-sm font-bold text-slate-500">대기 없음</p>

    <ul v-else class="mt-4 divide-y divide-slate-100">
      <li v-for="item in items" :key="item.id" class="flex items-center justify-between gap-3 py-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-extrabold text-slate-900">{{ item.name }}</p>
          <p class="mt-0.5 text-xs font-bold text-slate-500">{{ item.assigned_department }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40"
          :disabled="savingId === item.id"
          @click="handleApprove(item.id)"
        >
          승인
        </button>
      </li>
    </ul>
  </section>
</template>

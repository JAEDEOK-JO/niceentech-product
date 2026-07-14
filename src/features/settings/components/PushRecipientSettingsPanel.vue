<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  fetchPushRecipientRows,
  setDrawingPushEnabled,
  type PushRecipientRow,
} from '@/features/settings/services/pushRecipientSettings.service'

const loading = ref(false)
const savingUserId = ref('')
const errorMessage = ref('')
const rows = ref<PushRecipientRow[]>([])

async function loadRows() {
  loading.value = true
  errorMessage.value = ''
  try {
    rows.value = await fetchPushRecipientRows()
  } catch {
    errorMessage.value = '목록을 불러오지 못했습니다.'
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function handleToggle(row: PushRecipientRow, event: Event) {
  const next = Boolean((event.target as HTMLInputElement)?.checked)
  if (savingUserId.value) return

  const previous = row.drawingEnabled
  row.drawingEnabled = next
  savingUserId.value = row.userId
  errorMessage.value = ''

  try {
    await setDrawingPushEnabled(row.userId, next)
  } catch {
    row.drawingEnabled = previous
    errorMessage.value = '저장에 실패했습니다.'
  } finally {
    savingUserId.value = ''
  }
}

onMounted(() => {
  void loadRows()
})
</script>

<template>
  <div class="grid gap-4">
    <div class="border-b border-slate-200 pb-4">
      <p class="text-sm font-bold text-slate-500">설정</p>
      <h1 class="mt-1 text-2xl font-extrabold text-slate-900">알림 수신</h1>
    </div>

    <p v-if="loading" class="text-sm font-bold text-slate-500">불러오는 중...</p>
    <p v-else-if="errorMessage" class="text-sm font-bold text-rose-600">{{ errorMessage }}</p>

    <div v-else class="overflow-hidden rounded-2xl border border-slate-200">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">이름</th>
            <th class="px-4 py-3">부서</th>
            <th class="px-4 py-3">도면배포</th>
            <th class="px-4 py-3">기기</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.userId"
            class="border-t border-slate-100"
          >
            <td class="px-4 py-3 font-bold text-slate-900">{{ row.name }}</td>
            <td class="px-4 py-3 text-slate-600">{{ row.department || '-' }}</td>
            <td class="px-4 py-3">
              <label class="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                  :checked="row.drawingEnabled"
                  :disabled="savingUserId === row.userId"
                  @change="handleToggle(row, $event)"
                />
                <span class="text-xs font-bold text-slate-600">
                  {{ row.drawingEnabled ? 'ON' : 'OFF' }}
                </span>
              </label>
            </td>
            <td class="px-4 py-3 text-xs font-bold" :class="row.hasToken ? 'text-emerald-600' : 'text-slate-400'">
              {{ row.hasToken ? '등록' : '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import RewardPhotoViewer from '@/features/worker/reward/RewardPhotoViewer.vue'
import RewardReportSides from '@/features/worker/reward/RewardReportSides.vue'
import { fetchPendingRewards, reviewReward } from '../services/workerRewardReview.service'

const items = ref([])
const loading = ref(false)
const savingId = ref('')
const message = ref('')
const viewerUrls = ref([])

const formatWhen = (value) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

async function load() {
  loading.value = true
  message.value = ''
  try {
    items.value = await fetchPendingRewards()
  } catch {
    items.value = []
    message.value = '불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function review(id, status) {
  if (savingId.value) return
  savingId.value = id
  message.value = ''
  const result = await reviewReward(id, status)
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
    <h2 class="text-lg font-extrabold text-slate-900">포상</h2>

    <p v-if="loading" class="mt-6 text-sm font-bold text-slate-500">불러오는 중...</p>
    <template v-else>
      <p v-if="message" class="mt-6 text-sm font-bold text-red-500">{{ message }}</p>
      <p v-if="items.length === 0 && !message" class="mt-6 text-sm font-bold text-slate-500">대기 없음</p>

      <ul v-if="items.length" class="mt-4 space-y-4">
        <li v-for="item in items" :key="item.id" class="rounded-xl border border-slate-200 px-4 py-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-extrabold text-slate-900">{{ item.name }}</p>
              <p class="mt-0.5 text-xs font-bold text-slate-500">{{ item.department }} · {{ formatWhen(item.created_at) }}</p>
              <div class="mt-3">
                <RewardReportSides
                  :note="item.found_note || ''"
                  :normal-urls="item.normalPhotoUrls"
                  :problem-urls="item.problemPhotoUrls"
                  @open="viewerUrls = $event"
                />
              </div>
            </div>
            <div class="flex shrink-0 gap-2">
              <button
                type="button"
                class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-600 disabled:opacity-40"
                :disabled="savingId === item.id"
                @click="review(item.id, '반려')"
              >
                반려
              </button>
              <button
                type="button"
                class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-extrabold text-white disabled:opacity-40"
                :disabled="savingId === item.id"
                @click="review(item.id, '승인')"
              >
                승인
              </button>
            </div>
          </div>
        </li>
      </ul>
    </template>

    <RewardPhotoViewer v-if="viewerUrls.length" :urls="viewerUrls" @close="viewerUrls = []" />
  </section>
</template>

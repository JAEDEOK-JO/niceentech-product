<script setup>
import { computed, onMounted, ref } from 'vue'
import RewardPhotoViewer from './RewardPhotoViewer.vue'
import RewardReportSides from './RewardReportSides.vue'
import { formatRewardWon } from './rewardAmount'
import { reportInRewardMonth, rewardMonthLabel, shiftRewardMonth } from './rewardMonth'
import { fetchMyRewards } from './reward.service'
import WorkerRewardRegisterView from './WorkerRewardRegisterView.vue'

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
})

const items = ref([])
const loading = ref(false)
const loadFailed = ref(false)
const registering = ref(false)
const monthOffset = ref(0)
const viewerUrls = ref([])

const monthTitle = computed(() => rewardMonthLabel(monthOffset.value))
const visibleItems = computed(() =>
  items.value.filter((item) => reportInRewardMonth(item.created_at, monthOffset.value)),
)
const approvedTotal = computed(() =>
  visibleItems.value
    .filter((item) => item.status === '승인')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0),
)

const statusClass = (status) => {
  if (status === '승인') return 'bg-emerald-100 text-emerald-700'
  if (status === '반려') return 'bg-red-100 text-red-600'
  return 'bg-amber-100 text-amber-700'
}

const formatWhen = (value) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    items.value = await fetchMyRewards(props.userId)
  } catch {
    items.value = []
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

async function onSubmitted() {
  registering.value = false
  monthOffset.value = 0
  await load()
}

onMounted(load)
</script>

<template>
  <WorkerRewardRegisterView
    v-if="registering"
    :user-id="userId"
    @cancel="registering = false"
    @submitted="onSubmitted"
  />

  <div v-else class="px-4 py-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h2 class="min-w-0 text-sm font-extrabold text-slate-700">{{ monthTitle }}</h2>
      <div class="flex shrink-0 items-center gap-3">
        <p class="text-sm font-extrabold text-amber-700">{{ formatRewardWon(approvedTotal) }}</p>
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-extrabold text-white"
          @click="registering = true"
        >
          등록하기
        </button>
      </div>
    </div>

    <div class="mb-3 grid grid-cols-3 gap-2">
      <button
        type="button"
        class="rounded-xl bg-white py-2 text-sm font-extrabold text-slate-600"
        @click="monthOffset = shiftRewardMonth(monthOffset, -1)"
      >
        지난달
      </button>
      <button
        type="button"
        class="rounded-xl py-2 text-sm font-extrabold"
        :class="monthOffset === 0 ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'"
        @click="monthOffset = 0"
      >
        이번달
      </button>
      <button
        type="button"
        class="rounded-xl bg-white py-2 text-sm font-extrabold text-slate-600 disabled:opacity-40"
        :disabled="monthOffset === 0"
        @click="monthOffset = shiftRewardMonth(monthOffset, 1)"
      >
        다음달
      </button>
    </div>

    <div v-if="loading" class="py-16 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
    </div>
    <p v-else-if="loadFailed" class="py-10 text-center text-sm font-bold text-red-500">불러오지 못했습니다.</p>
    <p
      v-else-if="visibleItems.length === 0"
      class="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400"
    >
      내역 없음
    </p>
    <div v-else class="space-y-2">
      <article
        v-for="item in visibleItems"
        :key="item.id"
        class="rounded-2xl border border-slate-200 bg-white p-3"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <p class="text-xs font-bold text-slate-400">{{ formatWhen(item.created_at) }}</p>
          <div class="flex shrink-0 items-center gap-2">
            <p v-if="item.status === '승인'" class="text-xs font-extrabold text-amber-700">
              {{ formatRewardWon(item.amount) }}
            </p>
            <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="statusClass(item.status)">
              {{ item.status }}
            </span>
          </div>
        </div>
        <RewardReportSides
          :note="item.found_note || ''"
          :normal-urls="item.normalPhotoUrls"
          :problem-urls="item.problemPhotoUrls"
          @open="viewerUrls = $event"
        />
      </article>
    </div>
  </div>

  <RewardPhotoViewer v-if="viewerUrls.length" :urls="viewerUrls" @close="viewerUrls = []" />
</template>

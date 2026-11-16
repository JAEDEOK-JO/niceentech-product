<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import RewardPhotoViewer from '@/features/worker/reward/RewardPhotoViewer.vue'
import { fetchRewardReports, reviewReward } from '@/features/settings/services/workerRewardReview.service'
import RewardDashboardFilters from './RewardDashboardFilters.vue'
import RewardDashboardTable from './RewardDashboardTable.vue'
import RewardSummaryCards from './RewardSummaryCards.vue'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const status = ref('전체')
const query = ref('')
const items = ref([])
const loading = ref(false)
const message = ref('')
const savingId = ref('')
const viewerUrls = ref([])

defineProps({
  canReview: { type: Boolean, default: false },
})

const summary = computed(() => {
  const approved = items.value.filter((item) => item.status === '승인')
  return {
    pending: items.value.filter((item) => item.status === '대기').length,
    approved: approved.length,
    rejected: items.value.filter((item) => item.status === '반려').length,
    amount: approved.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  }
})

const visibleItems = computed(() => {
  const keyword = query.value.trim()
  const selected = status.value === '포상금' ? '승인' : status.value
  return items.value.filter((item) => {
    if (selected !== '전체' && item.status !== selected) return false
    if (!keyword) return true
    return [item.name, item.department, item.found_note, item.original_note].some((value) =>
      String(value || '').includes(keyword),
    )
  })
})

async function load() {
  loading.value = true
  message.value = ''
  try {
    items.value = await fetchRewardReports({ year: year.value, month: month.value || null })
  } catch {
    items.value = []
    message.value = '불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function selectStatus(next) {
  status.value = status.value === next ? '전체' : next
}

async function review(id, nextStatus) {
  if (savingId.value) return
  savingId.value = id
  message.value = ''
  const result = await reviewReward(id, nextStatus)
  savingId.value = ''
  if (!result.ok) {
    message.value = result.message
    return
  }
  items.value = items.value.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
}

watch([year, month], load)
onMounted(load)
</script>

<template>
  <div class="grid gap-3">
    <RewardSummaryCards :summary="summary" :status="status" @select="selectStatus" />
    <RewardDashboardFilters
      :year="year"
      :month="month"
      :status="status"
      :query="query"
      @update:year="year = $event"
      @update:month="month = $event"
      @update:status="status = $event"
      @update:query="query = $event"
    />
    <p v-if="message" class="text-sm font-bold text-red-500">{{ message }}</p>
    <p v-if="loading" class="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm font-bold text-slate-400">
      불러오는 중...
    </p>
    <RewardDashboardTable
      v-else
      :items="visibleItems"
      :saving-id="savingId"
      :can-review="canReview"
      @review="review"
      @open="viewerUrls = $event"
    />
    <RewardPhotoViewer v-if="viewerUrls.length" :urls="viewerUrls" @close="viewerUrls = []" />
  </div>
</template>

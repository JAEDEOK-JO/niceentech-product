<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import RewardPhotoViewer from '@/features/worker/reward/RewardPhotoViewer.vue'
import { fetchRewardReports, reviewReward } from '@/features/settings/services/workerRewardReview.service'
import { deleteRewardReport } from './rewardAdminEdit.service'
import RewardDashboardFilters from './RewardDashboardFilters.vue'
import RewardDashboardTable from './RewardDashboardTable.vue'
import RewardReportEditDialog from './RewardReportEditDialog.vue'
import RewardSummaryCards from './RewardSummaryCards.vue'
import { closeRewardSearch, rewardSearchQuery } from './rewardSearchBridge'
import { currentRewardDashboardMonth, shiftRewardDashboardMonth } from './rewardDashboardMonth'

const now = currentRewardDashboardMonth()
const year = ref(now.year)
const month = ref(now.month)
const status = ref('전체')
const items = ref([])
const loading = ref(false)
const message = ref('')
const savingId = ref('')
const viewer = ref(null)
const editing = ref(null)

defineProps({
  canReview: { type: Boolean, default: false },
})

const summary = computed(() => ({
  pending: items.value.filter((item) => item.status === '대기').length,
  approved: items.value.filter((item) => item.status === '승인').length,
  rejected: items.value.filter((item) => item.status === '반려').length,
  amount: items.value.reduce((sum, item) => sum + (item.status === '승인' ? Number(item.amount || 0) : 0), 0),
}))

const visibleItems = computed(() => {
  const keyword = rewardSearchQuery.value.trim()
  return items.value.filter((item) => {
    if (status.value !== '전체' && item.status !== status.value) return false
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

function shiftMonth(delta) {
  const next = shiftRewardDashboardMonth(year.value, month.value, delta)
  year.value = next.year
  month.value = next.month
}

function showCurrentMonth() {
  const current = currentRewardDashboardMonth()
  year.value = current.year
  month.value = current.month
}

async function remove(item) {
  if (savingId.value || !window.confirm('삭제할까요?')) return
  savingId.value = item.id
  message.value = ''
  try {
    await deleteRewardReport(item)
    items.value = items.value.filter((row) => row.id !== item.id)
  } catch {
    message.value = '삭제에 실패했습니다.'
  } finally {
    savingId.value = ''
  }
}

async function onEdited() {
  editing.value = null
  await load()
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
onUnmounted(closeRewardSearch)
</script>

<template>
  <div class="grid gap-3">
    <RewardSummaryCards :summary="summary" :status="status" @select="selectStatus" />
    <RewardDashboardFilters
      :year="year"
      :month="month"
      :status="status"
      @shift-month="shiftMonth"
      @current-month="showCurrentMonth"
      @update:status="status = $event"
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
      @open="viewer = $event"
      @edit="editing = $event"
      @remove="remove"
    />
    <RewardReportEditDialog
      v-if="editing"
      :report="editing"
      @close="editing = null"
      @saved="onEdited"
    />
    <RewardPhotoViewer
      v-if="viewer?.urls?.length"
      :urls="viewer.urls"
      :labels="viewer.labels"
      :start="viewer.start"
      @close="viewer = null"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import RewardFeedList from './RewardFeedList.vue'
import RewardMonthNav from './RewardMonthNav.vue'
import RewardMonthRanks from './RewardMonthRanks.vue'
import RewardMyCard from './RewardMyCard.vue'
import RewardPhotoViewer from './RewardPhotoViewer.vue'
import RewardViewTabs from './RewardViewTabs.vue'
import { reportInRewardMonth, rewardMonthLabel, rewardMonthShortLabel, shiftRewardMonth } from './rewardMonth'
import { rewardRanks } from './rewardRanks'
import { rewardStats } from './rewardStats'
import { fetchRewardFeed } from './reward.service'
import WorkerRewardRegisterView from './WorkerRewardRegisterView.vue'

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: '',
  },
  department: {
    type: String,
    default: '',
  },
})

const items = ref([])
const loading = ref(false)
const loadFailed = ref(false)
const registering = ref(false)
const view = ref('all')
const monthOffset = ref(0)
const viewer = ref(null)

const monthTitle = computed(() => rewardMonthLabel(monthOffset.value))
const monthShort = computed(() => rewardMonthShortLabel(monthOffset.value))
const visibleItems = computed(() =>
  items.value.filter((item) => reportInRewardMonth(item.created_at, monthOffset.value)),
)
const myItems = computed(() => visibleItems.value.filter((item) => item.user_id === props.userId))
const myStats = computed(() => rewardStats(myItems.value))
const ranks = computed(() => rewardRanks(visibleItems.value))

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    items.value = await fetchRewardFeed()
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

  <div v-else class="space-y-4 px-4 py-4">
    <button
      type="button"
      class="w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white"
      @click="registering = true"
    >
      포상 등록
    </button>

    <RewardViewTabs v-model="view" />

    <RewardMonthNav
      :label="monthTitle"
      :can-next="monthOffset < 0"
      @prev="monthOffset = shiftRewardMonth(monthOffset, -1)"
      @next="monthOffset = shiftRewardMonth(monthOffset, 1)"
    />

    <div v-if="loading" class="py-16 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
    </div>
    <p v-else-if="loadFailed" class="py-10 text-center text-sm font-bold text-red-500">불러오지 못했습니다.</p>
    <template v-else-if="view === 'all'">
      <RewardMonthRanks :ranks="ranks" />
      <RewardFeedList title="등록 내역" :items="visibleItems" @open="viewer = $event" />
    </template>
    <template v-else>
      <RewardMyCard :name="name" :department="department" :month="monthShort" :stats="myStats" />
      <RewardFeedList title="내 등록 내역" :items="myItems" @open="viewer = $event" />
    </template>
  </div>

  <RewardPhotoViewer
    v-if="viewer?.urls.length"
    :urls="viewer.urls"
    :labels="viewer.labels"
    :start="viewer.start"
    @close="viewer = null"
  />
</template>

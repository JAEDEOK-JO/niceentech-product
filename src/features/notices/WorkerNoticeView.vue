<script setup>
import { onMounted, ref } from 'vue'
import { confirmNotice, fetchNoticeWorkers, fetchNotices } from './notice.service'
import WorkerNoticeDetail from './WorkerNoticeDetail.vue'
import WorkerNoticeList from './WorkerNoticeList.vue'

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
})

const notices = ref([])
const workers = ref([])
const loading = ref(false)
const loadFailed = ref(false)
const selectedId = ref('')
const confirmingId = ref('')
const message = ref('')

const selected = () => notices.value.find((notice) => notice.id === selectedId.value) ?? null

async function load() {
  loading.value = true
  loadFailed.value = false
  try {
    const [nextNotices, nextWorkers] = await Promise.all([fetchNotices(), fetchNoticeWorkers()])
    notices.value = nextNotices
    workers.value = nextWorkers
    if (selectedId.value && !nextNotices.some((notice) => notice.id === selectedId.value)) {
      selectedId.value = ''
    }
  } catch {
    notices.value = []
    workers.value = []
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

async function confirm(notice) {
  if (!notice?.id || confirmingId.value) return
  confirmingId.value = notice.id
  message.value = ''
  try {
    await confirmNotice(notice.id)
    notice.checkedUserIds = [...notice.checkedUserIds, props.userId]
    selectedId.value = notice.id
  } catch {
    message.value = '확인에 실패했습니다.'
  } finally {
    confirmingId.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div v-if="loading" class="flex h-full items-center justify-center">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
  </div>
  <p v-else-if="loadFailed" class="py-16 text-center text-sm font-bold text-red-500">불러오지 못했습니다.</p>
  <WorkerNoticeDetail
    v-else-if="selected()"
    :notice="selected()"
    :workers="workers"
    :user-id="userId"
    :confirming="confirmingId === selectedId"
    :message="message"
    @back="selectedId = ''"
    @confirm="confirm(selected())"
  />
  <WorkerNoticeList
    v-else
    :notices="notices"
    :workers="workers"
    :user-id="userId"
    @open="selectedId = $event.id"
  />
</template>

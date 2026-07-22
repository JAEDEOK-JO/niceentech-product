<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ConfirmOptionId } from '../utils/productionRequestMessage'
import {
  parseProductionConfirm,
  parseProductionRecheck,
  parseProductionRequest,
} from '../utils/productionRequestMessage'
import {
  fetchWorkBoardPage,
  WORK_BOARD_PAGE_SIZE,
  type WorkBoardItem,
  type WorkBoardTab,
} from '../services/productionWorkBoard.service'
import MessengerProductionRequestCard from './MessengerProductionRequestCard.vue'
import MessengerProductionConfirmCard from './MessengerProductionConfirmCard.vue'
import MessengerProductionRecheckCard from './MessengerProductionRecheckCard.vue'

const props = defineProps<{
  roomId: string
  tab: WorkBoardTab
  confirmingMessageId?: string
}>()

const emit = defineEmits<{
  confirm: [payload: { messageId: string; optionId: ConfirmOptionId }]
}>()

const items = ref<WorkBoardItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const errorMessage = ref('')
const listRef = ref<HTMLElement | null>(null)

let loadToken = 0

const resetAndLoad = async () => {
  const token = ++loadToken
  items.value = []
  hasMore.value = true
  errorMessage.value = ''
  loading.value = true
  const result = await fetchWorkBoardPage({
    roomId: props.roomId,
    tab: props.tab,
    offset: 0,
    limit: WORK_BOARD_PAGE_SIZE,
  })
  if (token !== loadToken) return
  loading.value = false
  if (!result.ok) {
    errorMessage.value = '불러오기 실패'
    return
  }
  items.value = result.items
  hasMore.value = result.hasMore
}

const loadMore = async () => {
  if (!hasMore.value || loading.value || loadingMore.value) return
  loadingMore.value = true
  const token = loadToken
  const result = await fetchWorkBoardPage({
    roomId: props.roomId,
    tab: props.tab,
    offset: items.value.length,
    limit: WORK_BOARD_PAGE_SIZE,
  })
  if (token !== loadToken) return
  loadingMore.value = false
  if (!result.ok) {
    errorMessage.value = '더 불러오기 실패'
    return
  }
  items.value = [...items.value, ...result.items]
  hasMore.value = result.hasMore
}

const onScroll = () => {
  const el = listRef.value
  if (!el) return
  const remain = el.scrollHeight - el.scrollTop - el.clientHeight
  if (remain < 120) void loadMore()
}

watch(
  () => [props.roomId, props.tab] as const,
  () => {
    void resetAndLoad()
  },
  { immediate: true },
)

watch(listRef, async (el, prev) => {
  prev?.removeEventListener('scroll', onScroll)
  await nextTick()
  el?.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  listRef.value?.removeEventListener('scroll', onScroll)
})

defineExpose({
  refresh: resetAndLoad,
})
</script>

<template>
  <div ref="listRef" class="flex-1 overflow-y-auto px-3 py-4 md:px-4">
    <div v-if="loading" class="flex h-full items-center justify-center text-sm text-slate-400">
      불러오는 중...
    </div>
    <div
      v-else-if="errorMessage"
      class="flex h-full items-center justify-center text-sm text-rose-500"
    >
      {{ errorMessage }}
    </div>
    <div
      v-else-if="items.length === 0"
      class="flex h-full items-center justify-center text-sm text-slate-400"
    >
      {{ tab === 'open' ? '작업요청 없음' : '작업완료 없음' }}
    </div>
    <div v-else class="mx-auto flex max-w-[440px] flex-col gap-3">
      <div v-for="item in items" :key="item.id">
        <MessengerProductionRequestCard
          v-if="item.displayKind === 'request' && parseProductionRequest(item.message.content)"
          :payload="parseProductionRequest(item.message.content)!"
          :message-id="item.message.id"
          :sender-name="item.message.sender_name"
          :confirming="confirmingMessageId === item.message.id"
          @confirm="emit('confirm', $event)"
        />
        <MessengerProductionConfirmCard
          v-else-if="item.displayKind === 'confirm' && parseProductionConfirm(item.message.content)"
          :payload="parseProductionConfirm(item.message.content)!"
          :message-id="item.message.id"
          :sender-name="item.message.sender_name"
          :confirming="confirmingMessageId === item.message.id"
          @confirm="emit('confirm', $event)"
        />
        <MessengerProductionRecheckCard
          v-else-if="item.displayKind === 'recheck' && parseProductionRecheck(item.message.content)"
          :payload="parseProductionRecheck(item.message.content)!"
          :message-id="item.message.id"
          :sender-name="item.message.sender_name"
          :confirming="confirmingMessageId === item.message.id"
          @confirm="emit('confirm', $event)"
        />
      </div>
      <p v-if="loadingMore" class="py-3 text-center text-xs text-slate-400">불러오는 중...</p>
      <p v-else-if="!hasMore" class="py-3 text-center text-xs text-slate-300">끝</p>
    </div>
  </div>
</template>

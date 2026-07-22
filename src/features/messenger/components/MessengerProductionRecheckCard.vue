<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ConfirmOptionId, ProductionRecheckPayload } from '../utils/productionRequestMessage'
import { formatProductionPlanTitle } from '../utils/productionPlanLabel'
import MessengerDrawingFilesDialog from './MessengerDrawingFilesDialog.vue'
import MessengerWorkConfirmDialog from './MessengerWorkConfirmDialog.vue'

const props = defineProps<{
  payload: ProductionRecheckPayload
  messageId: string
  senderName?: string
  confirming?: boolean
}>()

const emit = defineEmits<{
  confirm: [payload: { messageId: string; optionId: ConfirmOptionId }]
}>()

const drawingListOpen = ref(false)
const confirmDialogOpen = ref(false)

const planTitle = computed(() =>
  formatProductionPlanTitle(props.payload.testDate, props.payload.initial),
)

const drawingFiles = computed(() => {
  if (props.payload.drawings?.length) return props.payload.drawings
  if (props.payload.drawingUrl) {
    return [{ id: 0, name: '', viewUrl: props.payload.drawingUrl }]
  }
  return []
})

const canOpenDrawing = computed(
  () => props.payload.hasDrawing && (drawingFiles.value.length > 0 || Boolean(props.payload.productId)),
)

const canConfirm = computed(() => !props.payload.closed)

const handleSelectOption = (optionId: ConfirmOptionId) => {
  confirmDialogOpen.value = false
  emit('confirm', { messageId: props.messageId, optionId })
}
</script>

<template>
  <article
    class="w-[400px] max-w-[calc(100vw-96px)] overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm"
  >
    <div class="border-b border-sky-100 bg-sky-50 px-3.5 py-2.5">
      <p class="text-xs font-extrabold tracking-wide text-sky-700">재확인 요청</p>
      <p class="mt-1 break-words text-sm font-extrabold leading-snug text-slate-900">{{ planTitle }}</p>
      <p class="mt-0.5 break-words text-xs text-slate-500">
        {{ [payload.company, payload.place].filter(Boolean).join(' · ') || '-' }}
      </p>
      <p
        v-if="payload.area"
        class="mt-0.5 break-words text-xs leading-5 text-slate-500"
      >
        {{ payload.area }}
      </p>
    </div>

    <div class="space-y-3 px-3.5 py-3">
      <div v-if="payload.requestText">
        <p class="text-[11px] font-bold text-slate-400">요청사항</p>
        <p class="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{{ payload.requestText }}</p>
      </div>

      <div v-if="payload.recipients?.length">
        <p class="text-[11px] font-bold text-slate-400">받는 사람</p>
        <div class="mt-1.5 flex flex-wrap gap-1.5">
          <span
            v-for="name in payload.recipients"
            :key="name"
            class="rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-extrabold text-sky-700"
          >
            {{ name }}
          </span>
        </div>
      </div>

      <div class="flex gap-2">
        <button
          v-if="canOpenDrawing"
          type="button"
          class="flex min-h-9 flex-1 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-xs font-extrabold text-[#c2410c] hover:bg-orange-100"
          @click="drawingListOpen = true"
        >
          도면보기
        </button>
        <button
          type="button"
          class="flex min-h-9 flex-1 items-center justify-center rounded-xl text-xs font-extrabold transition"
          :class="
            !canConfirm || confirming
              ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
              : 'border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
          "
          :disabled="!canConfirm || confirming"
          @click="confirmDialogOpen = true"
        >
          작업확인
        </button>
      </div>
    </div>

    <MessengerDrawingFilesDialog
      :open="drawingListOpen"
      :product-id="payload.productId"
      :initial-files="drawingFiles"
      @close="drawingListOpen = false"
    />
    <MessengerWorkConfirmDialog
      :open="confirmDialogOpen"
      :submitting="confirming"
      @close="confirmDialogOpen = false"
      @select="handleSelectOption"
    />
  </article>
</template>

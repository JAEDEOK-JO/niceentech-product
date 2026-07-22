<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ProductionRequestPayload } from '../utils/productionRequestMessage'
import { formatConfirmDateTime } from '../utils/productionRequestMessage'
import { formatProductionPlanTitle } from '../utils/productionPlanLabel'
import MessengerDrawingFilesDialog from './MessengerDrawingFilesDialog.vue'
import MessengerWorkConfirmDialog from './MessengerWorkConfirmDialog.vue'
import type { ConfirmOptionId } from '../utils/productionRequestMessage'

const props = defineProps<{
  payload: ProductionRequestPayload
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

const isConfirmed = computed(() => Boolean(props.payload.confirmation?.confirmedAt))

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

const handleSelectOption = (optionId: ConfirmOptionId) => {
  confirmDialogOpen.value = false
  emit('confirm', { messageId: props.messageId, optionId })
}
</script>

<template>
  <article
    class="w-[400px] max-w-[calc(100vw-96px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
  >
    <div class="border-b border-slate-100 bg-slate-50 px-3.5 py-2.5">
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-extrabold tracking-wide text-slate-500">{{ payload.requestTypeLabel || '요청' }}</p>
        <span
          class="text-[11px] font-extrabold"
          :class="payload.hasDrawing ? 'text-[#c2410c]' : 'text-slate-300'"
        >
          {{ payload.hasDrawing ? '도면 있음' : '도면 없음' }}
        </span>
      </div>
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
      <p v-if="senderName" class="mt-1.5 text-[11px] font-bold text-slate-400">{{ senderName }}</p>
    </div>

    <div class="space-y-3 px-3.5 py-3">
      <div v-if="payload.requestText">
        <p class="text-[11px] font-bold text-slate-400">요청사항</p>
        <p class="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{{ payload.requestText }}</p>
      </div>

      <div>
        <p class="text-[11px] font-bold text-slate-400">받는 사람</p>
        <div class="mt-1.5 flex flex-wrap gap-1.5">
          <span
            v-for="name in payload.recipients"
            :key="name"
            class="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-extrabold text-indigo-700"
          >
            {{ name }}
          </span>
        </div>
      </div>

      <div v-if="isConfirmed && payload.confirmation" class="rounded-xl bg-slate-50 px-3 py-2">
        <p class="text-[11px] font-bold text-slate-400">작업확인</p>
        <p class="mt-1 text-sm font-semibold text-slate-800">
          {{ payload.confirmation.confirmedByName }} · {{ formatConfirmDateTime(payload.confirmation.confirmedAt) }}
        </p>
        <p class="mt-0.5 text-xs font-extrabold text-indigo-700">{{ payload.confirmation.optionLabel }}</p>
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
            isConfirmed || confirming
              ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
              : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          "
          :disabled="isConfirmed || confirming"
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

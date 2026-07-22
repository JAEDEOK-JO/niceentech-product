<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ProductDrawingSearchItem } from '../services/productDrawingSearch.service'
import {
  PRODUCTION_REQUEST_RECIPIENTS,
  PRODUCTION_REQUEST_TYPES,
  type ProductionRequestTypeId,
} from '../utils/productionRequestMessage'
import { formatProductionPlanTitle } from '../utils/productionPlanLabel'

const props = defineProps<{
  open: boolean
  product: ProductDrawingSearchItem | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: {
    requestType: ProductionRequestTypeId
    requestTypeLabel: string
    requestText: string
    recipients: string[]
  }]
}>()

const requestText = ref('')
const selectedRecipients = ref<string[]>([])
const selectedTypeId = ref<ProductionRequestTypeId | ''>('')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    requestText.value = ''
    selectedRecipients.value = []
    selectedTypeId.value = ''
  },
)

const productLabel = computed(() => {
  const p = props.product
  if (!p) return ''
  return [p.company, p.place].filter(Boolean).join(' · ')
})

const planTitle = computed(() => {
  const p = props.product
  if (!p) return ''
  return formatProductionPlanTitle(p.testDate, p.initial)
})

const selectedType = computed(
  () => PRODUCTION_REQUEST_TYPES.find((item) => item.id === selectedTypeId.value) ?? null,
)

const canSubmit = computed(
  () =>
    Boolean(props.product) &&
    Boolean(selectedType.value) &&
    selectedRecipients.value.length > 0 &&
    !props.submitting,
)

const toggleRecipient = (name: string) => {
  if (selectedRecipients.value.includes(name)) {
    selectedRecipients.value = selectedRecipients.value.filter((item) => item !== name)
    return
  }
  selectedRecipients.value = [...selectedRecipients.value, name]
}

const handleSubmit = () => {
  if (!canSubmit.value || !selectedType.value) return
  emit('submit', {
    requestType: selectedType.value.id,
    requestTypeLabel: selectedType.value.label,
    requestText: requestText.value.trim(),
    recipients: [...selectedRecipients.value],
  })
}
</script>

<template>
  <div
    v-if="open && product"
    class="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
  >
    <section
      class="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
    >
      <header class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 class="text-base font-extrabold text-slate-900">요청</h3>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          :disabled="submitting"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div class="flex items-start justify-between gap-2">
            <p class="min-w-0 flex-1 break-words text-sm font-extrabold leading-snug text-slate-900">{{ planTitle }}</p>
            <span
              class="shrink-0 text-xs font-extrabold"
              :class="product.hasDrawing ? 'text-[#c2410c]' : 'text-slate-300'"
            >
              {{ product.hasDrawing ? '도면 있음' : '도면 없음' }}
            </span>
          </div>
          <p class="mt-1 break-words text-xs text-slate-500">{{ productLabel || '-' }}</p>
          <p
            v-if="product.area"
            class="mt-0.5 break-words text-xs leading-5 text-slate-500"
          >
            {{ product.area }}
          </p>
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-600">요청 유형</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="type in PRODUCTION_REQUEST_TYPES"
              :key="type.id"
              type="button"
              class="rounded-xl border px-3 py-2 text-sm font-extrabold transition"
              :class="
                selectedTypeId === type.id
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              "
              :disabled="submitting"
              @click="selectedTypeId = type.id"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-600">요청사항</label>
          <textarea
            v-model="requestText"
            rows="4"
            class="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-300"
            :disabled="submitting"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-600">받는 사람</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="name in PRODUCTION_REQUEST_RECIPIENTS"
              :key="name"
              type="button"
              class="rounded-xl border px-3 py-2 text-sm font-extrabold transition"
              :class="
                selectedRecipients.includes(name)
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              "
              :disabled="submitting"
              @click="toggleRecipient(name)"
            >
              {{ name }}
            </button>
          </div>
        </div>
      </div>

      <footer class="border-t border-slate-100 px-4 py-3">
        <button
          type="button"
          class="flex min-h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-40"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          {{ submitting ? '전송 중...' : '전송' }}
        </button>
      </footer>
    </section>
  </div>
</template>

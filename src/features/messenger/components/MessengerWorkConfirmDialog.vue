<script setup lang="ts">
import {
  CONFIRM_DONE_OPTIONS,
  CONFIRM_PROGRESS_OPTIONS,
  type ConfirmOptionId,
} from '../utils/productionRequestMessage'

defineProps<{
  open: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [optionId: ConfirmOptionId]
}>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
  >
    <section
      class="flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
    >
      <header class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 class="text-base font-extrabold text-slate-900">작업확인</h3>
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

      <div class="space-y-4 px-4 py-4">
        <div>
          <p class="mb-2 text-xs font-bold text-slate-600">진행중</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in CONFIRM_PROGRESS_OPTIONS"
              :key="option.id"
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40"
              :disabled="submitting"
              @click="emit('select', option.id)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div>
          <p class="mb-2 text-xs font-bold text-slate-600">완료</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in CONFIRM_DONE_OPTIONS"
              :key="option.id"
              type="button"
              class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
              :disabled="submitting"
              @click="emit('select', option.id)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

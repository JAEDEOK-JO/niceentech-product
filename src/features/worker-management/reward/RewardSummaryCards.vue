<script setup>
import { formatRewardWon } from '@/features/worker/reward/rewardAmount'

defineProps({
  summary: {
    type: Object,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['select'])

const cards = [
  { id: '대기', label: '대기', key: 'pending' },
  { id: '승인', label: '승인', key: 'approved' },
  { id: '반려', label: '반려', key: 'rejected' },
]
</script>

<template>
  <div class="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-4">
    <button
      v-for="(card, index) in cards"
      :key="card.id"
      type="button"
      class="min-w-0 px-1 py-2 text-center"
      :class="[
        index > 0 ? 'border-l border-slate-200' : '',
        status === card.id ? 'bg-slate-900 text-white' : 'text-slate-800',
      ]"
      @click="emit('select', card.id)"
    >
      <span class="block truncate text-[11px] font-bold" :class="status === card.id ? 'text-slate-300' : 'text-slate-400'">
        {{ card.label }}
      </span>
      <span class="mt-0.5 block truncate text-sm font-extrabold tabular-nums">
        {{ summary[card.key] }}
      </span>
    </button>
    <div class="hidden min-w-0 border-l border-slate-200 px-1 py-2 text-center text-slate-800 md:block">
      <span class="block truncate text-[11px] font-bold text-slate-400">총 포상금</span>
      <span class="mt-0.5 block truncate text-sm font-extrabold tabular-nums">{{ formatRewardWon(summary.amount) }}</span>
    </div>
  </div>
</template>

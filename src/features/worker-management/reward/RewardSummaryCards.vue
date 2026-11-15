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
  { id: '대기', label: '대기', key: 'pending', tone: 'border-amber-100 bg-amber-50 text-amber-700' },
  { id: '승인', label: '승인', key: 'approved', tone: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
  { id: '반려', label: '반려', key: 'rejected', tone: 'border-rose-100 bg-rose-50 text-rose-600' },
  { id: '포상금', label: '포상금', key: 'amount', tone: 'border-slate-200 bg-white text-slate-900' },
]
</script>

<template>
  <div class="grid grid-cols-2 gap-2 lg:grid-cols-4">
    <button
      v-for="card in cards"
      :key="card.id"
      type="button"
      class="rounded-xl border px-4 py-3 text-left shadow-sm transition"
      :class="[card.tone, status === card.id ? 'ring-2 ring-slate-900' : '']"
      @click="emit('select', card.id)"
    >
      <p class="text-xs font-bold text-slate-500">{{ card.label }}</p>
      <p class="mt-1 text-2xl font-extrabold">
        {{ card.key === 'amount' ? formatRewardWon(summary.amount) : summary[card.key] }}
      </p>
    </button>
  </div>
</template>

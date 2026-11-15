<script setup>
import { computed } from 'vue'
import RewardPhotoGrid from './RewardPhotoGrid.vue'
import { formatRewardWon } from './rewardAmount'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['open'])

const initial = computed(() => String(props.item.name || '').trim().charAt(0))

const statusClass = computed(() => {
  if (props.item.status === '승인') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (props.item.status === '반려') return 'bg-rose-50 text-rose-600 ring-rose-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
})

const when = computed(() =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(props.item.created_at)),
)
</script>

<template>
  <article class="rounded-2xl border border-slate-200 bg-white p-4">
    <header class="flex items-start gap-3">
      <span
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-600"
      >
        {{ initial }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-extrabold text-slate-900">
          {{ item.name }}<span v-if="item.department" class="ml-1.5 text-xs font-bold text-slate-400">{{ item.department }}</span>
        </p>
        <p class="mt-0.5 text-xs font-bold text-slate-400">{{ when }}</p>
      </div>
      <div class="flex shrink-0 flex-col items-end gap-1">
        <span class="rounded-full px-2 py-0.5 text-[11px] font-bold ring-1" :class="statusClass">{{ item.status }}</span>
        <p v-if="item.status === '승인'" class="text-xs font-extrabold text-amber-700">
          {{ formatRewardWon(item.amount) }}
        </p>
      </div>
    </header>
    <p v-if="item.found_note" class="mt-3 break-words text-sm font-bold leading-6 text-slate-800">
      {{ item.found_note }}
    </p>
    <RewardPhotoGrid
      class="mt-3"
      :normal-urls="item.normalPhotoUrls"
      :problem-urls="item.problemPhotoUrls"
      @open="emit('open', $event)"
    />
  </article>
</template>

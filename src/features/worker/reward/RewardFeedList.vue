<script setup>
import RewardFeedCard from './RewardFeedCard.vue'

defineProps({
  title: {
    type: String,
    default: '',
  },
  items: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['open'])
</script>

<template>
  <section>
    <div class="mb-2 flex items-center justify-between px-1">
      <h3 class="text-sm font-extrabold text-slate-900">{{ title }}</h3>
      <span class="text-xs font-bold text-slate-400">{{ items.length }}건</span>
    </div>
    <p
      v-if="items.length === 0"
      class="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400"
    >
      내역 없음
    </p>
    <div v-else class="space-y-3">
      <RewardFeedCard v-for="item in items" :key="item.id" :item="item" @open="emit('open', $event)" />
    </div>
  </section>
</template>

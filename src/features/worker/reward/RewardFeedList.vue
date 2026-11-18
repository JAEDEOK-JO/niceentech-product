<script setup>
import RewardFeedCard from './RewardFeedCard.vue'
import { canOwnerChangeReward } from './rewardOwner'

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  items: {
    type: Array,
    default: () => [],
  },
  userId: {
    type: String,
    default: '',
  },
  busyId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['open', 'edit', 'remove'])
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
      <RewardFeedCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :can-manage="canOwnerChangeReward(item, props.userId)"
        :busy="props.busyId === item.id"
        @open="emit('open', $event)"
        @edit="emit('edit', item)"
        @remove="emit('remove', item)"
      />
    </div>
  </section>
</template>

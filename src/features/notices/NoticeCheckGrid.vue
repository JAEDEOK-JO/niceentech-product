<script setup>
import { computed } from 'vue'
import { noticeCheckCount, orderedNoticeWorkers } from './noticeOrder'

const props = defineProps({
  workers: {
    type: Array,
    default: () => [],
  },
  checkedIds: {
    type: Array,
    default: () => [],
  },
})

const ordered = computed(() => orderedNoticeWorkers(props.workers, props.checkedIds))
const count = computed(() => noticeCheckCount(props.workers, props.checkedIds))
</script>

<template>
  <section>
    <h3 class="text-sm font-extrabold text-slate-900">확인한사람 {{ count }}</h3>
    <p v-if="ordered.length === 0" class="mt-3 text-sm font-bold text-slate-400">없음</p>
    <div v-else class="mt-3 grid grid-cols-6 gap-2">
      <span
        v-for="worker in ordered"
        :key="worker.id"
        class="break-all rounded-lg px-0.5 py-1 text-center text-[11px] font-extrabold leading-tight"
        :class="checkedIds.includes(worker.id) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'"
      >
        {{ worker.name }}
      </span>
    </div>
  </section>
</template>

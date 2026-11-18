<script setup>
import { computed } from 'vue'
import { isCurrentRewardDashboardMonth } from './rewardDashboardMonth'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  status: { type: String, required: true },
})

const emit = defineEmits(['shift-month', 'current-month', 'update:status'])

const statuses = ['전체', '대기', '승인', '반려']
const isCurrentMonth = computed(() => isCurrentRewardDashboardMonth(props.year, props.month))

const selectClass =
  'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300'
const monthButtonClass = 'h-9 rounded-lg text-sm font-extrabold disabled:opacity-40'
</script>

<template>
  <div class="grid gap-2 rounded-xl border border-slate-200 bg-white p-3">
    <div class="flex items-center justify-between gap-2">
      <p class="text-base font-extrabold text-slate-900">{{ year }}년 {{ month }}월</p>
      <select :class="selectClass" :value="status" @change="emit('update:status', $event.target.value)">
        <option v-for="item in statuses" :key="item" :value="item">{{ item }}</option>
      </select>
    </div>
    <div class="grid grid-cols-3 gap-2">
      <button type="button" :class="[monthButtonClass, 'border border-slate-200 text-slate-700']" @click="emit('shift-month', -1)">
        지난달
      </button>
      <button
        type="button"
        :class="[monthButtonClass, isCurrentMonth ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700']"
        @click="emit('current-month')"
      >
        이번달
      </button>
      <button
        type="button"
        :class="[monthButtonClass, 'border border-slate-200 text-slate-700']"
        :disabled="isCurrentMonth"
        @click="emit('shift-month', 1)"
      >
        다음달
      </button>
    </div>
  </div>
</template>

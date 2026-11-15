<script setup>
defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  status: { type: String, required: true },
  query: { type: String, required: true },
})

const emit = defineEmits(['update:year', 'update:month', 'update:status', 'update:query'])

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, index) => currentYear - index)
const months = Array.from({ length: 12 }, (_, index) => index + 1)
const statuses = ['전체', '대기', '승인', '반려']

const selectClass =
  'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
    <select :class="selectClass" :value="year" @change="emit('update:year', Number($event.target.value))">
      <option v-for="item in years" :key="item" :value="item">{{ item }}년</option>
    </select>
    <select :class="selectClass" :value="month" @change="emit('update:month', Number($event.target.value))">
      <option :value="0">전체 월</option>
      <option v-for="item in months" :key="item" :value="item">{{ item }}월</option>
    </select>
    <select :class="selectClass" :value="status === '포상금' ? '승인' : status" @change="emit('update:status', $event.target.value)">
      <option v-for="item in statuses" :key="item" :value="item">{{ item }}</option>
    </select>
    <input
      :value="query"
      type="search"
      placeholder="이름 검색"
      class="h-9 min-w-[160px] flex-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
      @input="emit('update:query', $event.target.value)"
    />
  </div>
</template>

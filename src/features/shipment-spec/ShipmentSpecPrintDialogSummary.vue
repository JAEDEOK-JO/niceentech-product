<script setup>
import { computed } from 'vue'
import { shipmentSpecDisplayText } from './shipmentSpecDisplayText'

const props = defineProps({
  row: { type: Object, default: null },
})

const initial = computed(() => shipmentSpecDisplayText(props.row?.initial))
const company = computed(() => shipmentSpecDisplayText(props.row?.company))
const place = computed(() => shipmentSpecDisplayText(props.row?.place))
const area = computed(() => shipmentSpecDisplayText(props.row?.area))
</script>

<template>
  <div class="min-w-0">
    <p class="text-xl font-extrabold tracking-tight text-slate-900">{{ initial }}</p>
    <dl class="mt-1 space-y-0.5 text-sm">
      <div class="flex gap-2">
        <dt class="w-12 shrink-0 text-[11px] font-bold text-slate-500">회사명</dt>
        <dd class="min-w-0 break-words font-bold text-slate-800">{{ company }}</dd>
      </div>
      <div class="flex gap-2">
        <dt class="w-12 shrink-0 text-[11px] font-bold text-slate-500">현장명</dt>
        <dd class="min-w-0 break-words font-bold text-slate-800">{{ place }}</dd>
      </div>
      <div class="flex gap-2">
        <dt class="w-12 shrink-0 text-[11px] font-bold text-slate-500">구역명</dt>
        <dd class="min-w-0 break-words font-bold text-slate-800">{{ area }}</dd>
      </div>
    </dl>
  </div>
</template>

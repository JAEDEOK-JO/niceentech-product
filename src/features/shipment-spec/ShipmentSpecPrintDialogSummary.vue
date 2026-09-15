<script setup>
import { computed } from 'vue'
import { shipmentSpecDisplayText } from './shipmentSpecDisplayText'
import { useShipmentSpecDialogLocale } from './useShipmentSpecDialogLocale'

const props = defineProps({
  row: { type: Object, default: null },
})

const { copy } = useShipmentSpecDialogLocale()

const initial = computed(() => shipmentSpecDisplayText(props.row?.initial))
const company = computed(() => shipmentSpecDisplayText(props.row?.company))
const place = computed(() => shipmentSpecDisplayText(props.row?.place))
const area = computed(() => shipmentSpecDisplayText(props.row?.area))
</script>

<template>
  <div class="min-w-0">
    <p class="text-[11px] font-bold text-slate-500">{{ copy.drawing }}</p>
    <p class="text-xl font-extrabold tracking-tight text-slate-900">{{ initial }}</p>
    <dl class="mt-1 space-y-0.5 text-sm">
      <div class="flex gap-2">
        <dt class="w-[4.5rem] shrink-0 text-[11px] font-bold text-slate-500">{{ copy.company }}</dt>
        <dd class="min-w-0 break-words font-bold text-slate-800">{{ company }}</dd>
      </div>
      <div class="flex gap-2">
        <dt class="w-[4.5rem] shrink-0 text-[11px] font-bold text-slate-500">{{ copy.place }}</dt>
        <dd class="min-w-0 break-words font-bold text-slate-800">{{ place }}</dd>
      </div>
      <div class="flex gap-2">
        <dt class="w-[4.5rem] shrink-0 text-[11px] font-bold text-slate-500">{{ copy.area }}</dt>
        <dd class="min-w-0 break-words font-bold text-slate-800">{{ area }}</dd>
      </div>
    </dl>
  </div>
</template>

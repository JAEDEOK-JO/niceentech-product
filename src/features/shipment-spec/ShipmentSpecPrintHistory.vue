<script setup>
import Button from '@/components/ui/button/Button.vue'
import { useShipmentSpecDialogLocale } from './useShipmentSpecDialogLocale'

defineProps({
  items: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['remove'])
const { copy } = useShipmentSpecDialogLocale()
</script>

<template>
  <div v-if="items.length" class="space-y-2">
    <div>
      <p class="text-sm font-extrabold text-slate-800">{{ copy.historyTitle }}</p>
      <p class="text-xs font-bold text-slate-500">{{ copy.historyHelp }}</p>
    </div>
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="flex items-start gap-2"
    >
      <div class="min-h-[44px] w-full whitespace-pre-wrap rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{{ item.text }}</div>
      <Button
        class="h-9 w-9 shrink-0 px-0 text-base"
        variant="outline"
        :disabled="disabled"
        :aria-label="copy.remove"
        @click="emit('remove', index)"
      >{{ copy.remove }}</Button>
    </div>
  </div>
</template>

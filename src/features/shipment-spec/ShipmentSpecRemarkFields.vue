<script setup>
import Button from '@/components/ui/button/Button.vue'
import { useShipmentSpecDialogLocale } from './useShipmentSpecDialogLocale'

defineProps({
  remarkFields: { type: Array, default: () => [] },
})

const emit = defineEmits(['add', 'remove'])
const { copy } = useShipmentSpecDialogLocale()
</script>

<template>
  <div class="space-y-3">
    <div>
      <p class="text-sm font-extrabold text-slate-800">{{ copy.nextTitle }}</p>
      <p class="text-xs font-bold text-slate-500">{{ copy.nextHelp }}</p>
    </div>
    <div
      v-for="(field, index) in remarkFields"
      :key="field.id"
      class="flex items-start gap-2"
    >
      <textarea
        v-model="field.text"
        rows="2"
        class="min-h-[44px] w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
        :placeholder="copy.nextPlaceholder"
      />
      <Button
        v-if="remarkFields.length > 1"
        class="h-9 w-9 shrink-0 px-0 text-base"
        variant="outline"
        :aria-label="copy.remove"
        @click="emit('remove', index)"
      >{{ copy.remove }}</Button>
    </div>
    <Button class="h-9 px-4 text-sm" variant="outline" :aria-label="copy.add" @click="emit('add')">{{ copy.add }}</Button>
  </div>
</template>

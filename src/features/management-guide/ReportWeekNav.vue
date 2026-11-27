<script setup>
import Button from '@/components/ui/button/Button.vue'

defineProps({
  label: { type: String, required: true },
  isThisWeek: { type: Boolean, required: true },
  canGoNext: { type: Boolean, required: true },
  disabled: { type: Boolean, default: false },
})
defineEmits(['previous', 'current', 'next'])
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-2">
    <Button class="h-9 shrink-0 px-3 text-xs" variant="outline" :disabled="disabled" @click="$emit('previous')">지난주</Button>
    <Button
      class="h-9 shrink-0 px-3 text-xs"
      :variant="isThisWeek ? 'default' : 'outline'"
      :disabled="disabled"
      :aria-pressed="isThisWeek"
      @click="$emit('current')"
    >
      이번주
    </Button>
    <Button class="h-9 shrink-0 px-3 text-xs" variant="outline" :disabled="disabled || !canGoNext" @click="$emit('next')">다음주</Button>
    <span class="min-w-[80px] text-center text-xs font-bold text-slate-600">{{ label }}</span>
  </div>
</template>

<script setup>
import Button from '@/components/ui/button/Button.vue'

defineProps({
  remarkFields: { type: Array, default: () => [] },
})

const emit = defineEmits(['add', 'remove'])
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(field, index) in remarkFields"
      :key="field.id"
      class="flex items-start gap-2"
    >
      <textarea
        v-model="field.text"
        rows="2"
        class="min-h-[44px] w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
      />
      <Button
        v-if="remarkFields.length > 1"
        class="h-9 w-9 shrink-0 px-0 text-base"
        variant="outline"
        @click="emit('remove', index)"
      >−</Button>
    </div>
    <Button class="h-9 px-4 text-sm" variant="outline" @click="emit('add')">+</Button>
  </div>
</template>

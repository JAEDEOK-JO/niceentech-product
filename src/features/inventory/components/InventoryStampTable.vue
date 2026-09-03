<script setup>
import { Pencil } from 'lucide-vue-next'

defineProps({
  items: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['edit'])
</script>

<template>
  <div class="flex">
    <div
      v-for="(item, index) in items"
      :key="item.key || item.label"
      class="flex h-14 flex-col border border-slate-200"
      :class="[item.width || 'w-16', index > 0 ? 'border-l-0' : '']"
    >
      <span class="flex items-center justify-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1 py-0.5 text-[11px] font-bold text-slate-500">
        {{ item.label }}
        <button
          v-if="item.editable"
          type="button"
          class="flex h-4 w-4 items-center justify-center text-slate-400 hover:text-slate-700"
          aria-label="승인자재"
          @click="emit('edit', item)"
        >
          <Pencil class="h-3 w-3" />
        </button>
      </span>
      <span
        class="flex flex-1 items-center justify-center overflow-hidden px-1 text-xs font-extrabold text-slate-900"
        :title="item.value || ''"
      >
        <span class="truncate">{{ item.value }}</span>
      </span>
    </div>
  </div>
</template>

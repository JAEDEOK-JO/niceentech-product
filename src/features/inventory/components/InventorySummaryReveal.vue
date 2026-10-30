<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  count: { type: Number, default: 0 },
  limit: { type: Number, default: 10 },
})

const expanded = ref(false)
const visibleCount = computed(() => (expanded.value ? props.count : Math.min(props.count, props.limit)))
const canReveal = computed(() => props.count > props.limit)

watch(
  () => props.count,
  () => {
    expanded.value = false
  },
)
</script>

<template>
  <div>
    <slot :visible-count="visibleCount" />
    <button
      v-if="canReveal"
      type="button"
      class="w-full border-t px-3 py-2 text-center text-xs font-extrabold"
      :class="expanded
        ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
        : 'border-orange-200 bg-orange-100 text-orange-800 hover:bg-orange-200'"
      @click="expanded = !expanded"
    >
      {{ expanded ? '접기' : '더보기' }}
    </button>
  </div>
</template>

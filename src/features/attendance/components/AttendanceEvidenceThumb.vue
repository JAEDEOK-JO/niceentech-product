<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  urls: string[]
}>()

const emit = defineEmits<{
  (e: 'open', index?: number): void
}>()

const list = computed(() => (props.urls ?? []).filter(Boolean))
const firstUrl = computed(() => list.value[0] ?? '')
const extraCount = computed(() => Math.max(0, list.value.length - 1))
</script>

<template>
  <button
    v-if="firstUrl"
    type="button"
    class="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-200"
    @click.stop="emit('open', 0)"
  >
    <img :src="firstUrl" alt="" class="h-full w-full object-cover" />
    <span
      v-if="extraCount > 0"
      class="absolute bottom-0 right-0 rounded-tl bg-slate-900 px-1 text-[10px] font-extrabold leading-4 text-white"
    >
      +{{ extraCount }}
    </span>
  </button>
</template>

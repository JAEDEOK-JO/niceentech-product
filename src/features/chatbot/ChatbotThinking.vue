<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { formatThinkingDuration } from '@/features/chatbot/formatThinkingDuration'

const props = defineProps({
  live: { type: Boolean, default: false },
  durationMs: { type: Number, default: 0 },
  reasoning: { type: String, default: '' },
})

const open = ref(false)
const elapsedMs = ref(0)
let timer = 0

const label = computed(() => {
  const time = formatThinkingDuration(props.live ? elapsedMs.value : props.durationMs)
  return props.live ? `생각 중 ${time}` : `${time} 생각함`
})

watch(
  () => props.live,
  (live) => {
    window.clearInterval(timer)
    elapsedMs.value = 0
    if (!live) return
    const started = Date.now()
    timer = window.setInterval(() => {
      elapsedMs.value = Date.now() - started
    }, 200)
  },
  { immediate: true },
)

onUnmounted(() => window.clearInterval(timer))
</script>

<template>
  <div class="mb-2">
    <button
      v-if="!live && reasoning"
      class="flex items-center gap-1 text-sm text-slate-500"
      type="button"
      @click="open = !open"
    >
      <svg
        viewBox="0 0 20 20"
        class="h-3.5 w-3.5 transition-transform"
        :class="open ? 'rotate-90' : ''"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M7 5l6 5-6 5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      {{ label }}
    </button>
    <p v-else class="text-sm text-slate-500">{{ label }}</p>
    <p v-if="(live || open) && reasoning" class="mt-2 whitespace-pre-wrap border-l border-slate-200 pl-3 text-sm leading-6 text-slate-500">
      {{ reasoning }}
    </p>
  </div>
</template>

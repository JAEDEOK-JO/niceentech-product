<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  urls: string[]
  startIndex?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const index = ref(0)
const list = computed(() => (props.urls ?? []).filter(Boolean))
const currentUrl = computed(() => list.value[index.value] ?? '')
const canPrev = computed(() => index.value > 0)
const canNext = computed(() => index.value < list.value.length - 1)

watch(
  () => [props.visible, props.startIndex, props.urls] as const,
  ([visible]) => {
    if (!visible) return
    const start = Number(props.startIndex ?? 0)
    index.value = Math.min(Math.max(0, start), Math.max(0, list.value.length - 1))
  },
)

function prev() {
  if (!canPrev.value) return
  index.value -= 1
}

function next() {
  if (!canNext.value) return
  index.value += 1
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible && list.length > 0"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4"
      @click.self="emit('close')"
    >
      <div class="relative w-full max-w-3xl rounded-2xl bg-slate-950 p-4 shadow-2xl">
        <div class="mb-3 flex items-center justify-between text-white">
          <p class="text-sm font-bold">{{ index + 1 }} / {{ list.length }}</p>
          <button
            type="button"
            class="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-slate-900 hover:bg-slate-100"
            @click="emit('close')"
          >
            닫기
          </button>
        </div>

        <div class="relative flex items-center justify-center px-12">
          <button
            type="button"
            class="absolute left-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-bold text-slate-900 shadow-lg disabled:bg-slate-300 disabled:text-slate-500"
            :disabled="!canPrev"
            @click="prev"
          >
            ‹
          </button>

          <img
            :src="currentUrl"
            alt=""
            class="max-h-[70vh] w-full rounded-xl object-contain"
          />

          <button
            type="button"
            class="absolute right-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-bold text-slate-900 shadow-lg disabled:bg-slate-300 disabled:text-slate-500"
            :disabled="!canNext"
            @click="next"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

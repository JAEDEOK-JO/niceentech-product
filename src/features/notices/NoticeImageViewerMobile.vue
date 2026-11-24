<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useNoticeImageTouch } from './useNoticeImageTouch'

const props = defineProps({
  urls: {
    type: Array,
    default: () => [],
  },
  start: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['close'])

const rootRef = ref(null)
const scrollerRef = ref(null)
const index = ref(0)
const { scale, imageStyle, reset } = useNoticeImageTouch(rootRef, { onZoomStart: align })

let resizeObserver

function clampIndex(value) {
  return Math.min(Math.max(0, value), Math.max(0, props.urls.length - 1))
}

function align() {
  const scroller = scrollerRef.value
  if (!scroller) return
  scroller.scrollTo({ left: index.value * scroller.clientWidth, behavior: 'auto' })
}

function onScroll() {
  const scroller = scrollerRef.value
  if (!scroller || scale.value > 1) return
  const width = scroller.clientWidth || 1
  const next = clampIndex(Math.round(scroller.scrollLeft / width))
  if (next !== index.value) index.value = next
}

watch(
  () => props.start,
  (value) => {
    index.value = clampIndex(value)
    reset()
    nextTick(align)
  },
  { immediate: true },
)

watch(scale, async (value) => {
  if (value > 1) return
  await nextTick()
  align()
})

onMounted(() => {
  rootRef.value?.focus()
  align()
  resizeObserver = new ResizeObserver(() => {
    if (scale.value <= 1) align()
  })
  if (scrollerRef.value) resizeObserver.observe(scrollerRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="rootRef"
      class="fixed inset-0 z-[80] bg-black text-white outline-none"
      tabindex="0"
      @keydown.esc="emit('close')"
    >
      <div
        ref="scrollerRef"
        class="notice-image-scroller flex h-full w-full snap-x snap-mandatory overflow-y-hidden overscroll-x-contain"
        :class="scale > 1 ? 'overflow-x-hidden touch-none' : 'overflow-x-auto touch-pan-x'"
        @scroll.passive="onScroll"
      >
        <div v-for="(url, imageIndex) in urls" :key="`${imageIndex}-${url}`" class="h-full w-full shrink-0 snap-start overflow-hidden">
          <img
            :src="url"
            alt=""
            draggable="false"
            class="h-full w-full select-none object-contain"
            :style="imageIndex === index ? imageStyle : undefined"
          />
        </div>
      </div>

      <div
        class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <button type="button" class="pointer-events-auto text-sm font-bold text-white" @click="emit('close')">닫기</button>
        <span v-if="urls.length > 1" class="text-sm font-bold">{{ index + 1 }}/{{ urls.length }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.notice-image-scroller {
  -webkit-touch-callout: none;
  scrollbar-width: none;
}

.notice-image-scroller::-webkit-scrollbar {
  display: none;
}
</style>

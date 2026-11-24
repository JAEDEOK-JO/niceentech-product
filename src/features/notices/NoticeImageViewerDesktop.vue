<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useNoticeImageStripDrag } from './useNoticeImageStripDrag'
import { useNoticeImageZoom } from './useNoticeImageZoom'

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
const stripRef = ref(null)
const index = ref(0)
const count = computed(() => props.urls.length)
const { stageRef, scale, imageStyle, measure, setZoom, resetZoom } = useNoticeImageZoom()
const { dragging, trackStyle, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useNoticeImageStripDrag(
  index,
  count,
)

let pan = null
let resizeObserver

function clampIndex(value) {
  return Math.min(Math.max(0, value), Math.max(0, props.urls.length - 1))
}

function zoomBy(next) {
  if (scale.value <= 1 && stripRef.value) measure(stripRef.value)
  return setZoom(next)
}

function onViewerWheel(event) {
  zoomBy(scale.value * (event.deltaY < 0 ? 1.15 : 1 / 1.15))
}

function move(delta) {
  const next = index.value + delta
  if (next < 0 || next >= props.urls.length) return
  index.value = next
  resetZoom()
}

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
  if (event.key === 'ArrowLeft') move(-1)
  if (event.key === 'ArrowRight') move(1)
}

function onZoomPointerDown(event) {
  const stage = stageRef.value
  if (!stage || event.button !== 0) return
  pan = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: stage.scrollLeft,
    top: stage.scrollTop,
  }
  stage.setPointerCapture?.(event.pointerId)
}

function onZoomPointerMove(event) {
  const stage = stageRef.value
  if (!pan || pan.id !== event.pointerId || !stage) return
  stage.scrollLeft = pan.left - (event.clientX - pan.x)
  stage.scrollTop = pan.top - (event.clientY - pan.y)
}

function onZoomPointerUp(event) {
  if (!pan || pan.id !== event.pointerId) return
  pan = null
}

watch(
  () => props.start,
  (value) => {
    index.value = clampIndex(value)
    resetZoom()
  },
  { immediate: true },
)

watch(index, () => {
  resetZoom()
})

watch(scale, async (value) => {
  if (value <= 1) return
  await nextTick()
  measure()
})

onMounted(() => {
  rootRef.value?.focus()
  resizeObserver = new ResizeObserver(() => measure())
})

watch(stageRef, (element, previous) => {
  if (!resizeObserver) return
  if (previous) resizeObserver.unobserve(previous)
  if (!element) return
  resizeObserver.observe(element)
  measure()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 p-4" @click.self="emit('close')">
      <div
        ref="rootRef"
        class="flex h-[min(880px,calc(100dvh-2rem))] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl outline-none"
        tabindex="0"
        @keydown="onKeydown"
      >
        <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <button type="button" class="text-sm font-bold text-slate-700" @click="emit('close')">닫기</button>
          <span v-if="urls.length > 1" class="text-sm font-bold text-slate-500">{{ index + 1 }}/{{ urls.length }}</span>
          <div class="flex items-center gap-2">
            <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold" @click="zoomBy(scale / 1.35)">
              축소
            </button>
            <button type="button" class="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white" @click="zoomBy(scale * 1.35)">
              확대
            </button>
          </div>
        </div>

        <div
          v-if="scale <= 1"
          ref="stripRef"
          class="min-h-0 flex-1 touch-none select-none overflow-hidden bg-slate-100"
          :class="urls.length > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
          @pointerdown.prevent="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
          @wheel.prevent="onViewerWheel"
        >
          <div class="flex h-full w-full" :style="trackStyle">
            <div v-for="(url, imageIndex) in urls" :key="`${imageIndex}-${url}`" class="h-full w-full shrink-0 basis-full">
              <img :src="url" alt="" draggable="false" class="h-full w-full object-contain" />
            </div>
          </div>
        </div>

        <div
          v-else
          ref="stageRef"
          class="min-h-0 flex-1 cursor-grab touch-none select-none overflow-auto bg-slate-100 active:cursor-grabbing"
          @pointerdown.prevent="onZoomPointerDown"
          @pointermove="onZoomPointerMove"
          @pointerup="onZoomPointerUp"
          @pointercancel="onZoomPointerUp"
          @wheel.prevent="onViewerWheel"
        >
          <img :src="urls[index]" alt="" draggable="false" class="mx-auto block max-w-none object-contain" :style="imageStyle" />
        </div>

        <div v-if="urls.length > 1" class="flex justify-between border-t border-slate-200 px-4 py-3">
          <button type="button" class="text-sm font-bold disabled:opacity-40" :disabled="index === 0" @click="move(-1)">이전</button>
          <button
            type="button"
            class="text-sm font-bold disabled:opacity-40"
            :disabled="index === urls.length - 1"
            @click="move(1)"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

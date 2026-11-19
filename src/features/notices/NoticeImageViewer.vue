<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useWorkerBackClose } from '@/features/worker/pwa/useWorkerBackClose'
import { clampNoticeZoom, noticeSwipeStep } from './noticeImageZoom'

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

useWorkerBackClose(() => emit('close'))

const rootRef = ref(null)
const stageRef = ref(null)
const index = ref(0)
const scale = ref(1)
const frame = ref({ width: 1, height: 1 })
const points = new Map()
let pinchDistance = 0
let gesture = null
let lastTap = 0
let resizeObserver

const imageStyle = computed(() => ({
  width: `${frame.value.width * scale.value}px`,
  height: `${frame.value.height * scale.value}px`,
}))

function measure() {
  const stage = stageRef.value
  if (!stage) return
  frame.value = {
    width: Math.max(stage.clientWidth, 1),
    height: Math.max(stage.clientHeight, 1),
  }
}

async function setZoom(next) {
  const stage = stageRef.value
  const previous = scale.value || 1
  const clamped = clampNoticeZoom(next)
  if (!stage) {
    scale.value = clamped
    return
  }
  const anchorX = (stage.scrollLeft + stage.clientWidth / 2) / previous
  const anchorY = (stage.scrollTop + stage.clientHeight / 2) / previous
  scale.value = clamped
  await nextTick()
  stage.scrollLeft = anchorX * clamped - stage.clientWidth / 2
  stage.scrollTop = anchorY * clamped - stage.clientHeight / 2
}

function resetZoom() {
  scale.value = 1
  const stage = stageRef.value
  if (!stage) return
  stage.scrollLeft = 0
  stage.scrollTop = 0
}

function step(delta) {
  const next = index.value + delta
  if (next < 0 || next >= props.urls.length) return
  index.value = next
  resetZoom()
}

function onPointerDown(event) {
  points.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (points.size >= 2) {
    const [first, second] = [...points.values()]
    pinchDistance = Math.hypot(first.x - second.x, first.y - second.y)
    gesture = null
    return
  }
  gesture = { x: event.clientX, y: event.clientY }
}

function onPointerMove(event) {
  if (!points.has(event.pointerId)) return
  points.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (points.size < 2 || pinchDistance <= 0) return
  const [first, second] = [...points.values()]
  const distance = Math.hypot(first.x - second.x, first.y - second.y)
  if (distance <= 0) return
  const next = clampNoticeZoom(scale.value * (distance / pinchDistance))
  pinchDistance = distance
  setZoom(next)
}

function onPointerUp(event) {
  const start = gesture
  points.delete(event.pointerId)
  if (points.size < 2) pinchDistance = 0
  if (points.size !== 0) return
  gesture = null
  if (!start) return
  const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
  if (moved < 10) {
    const now = Date.now()
    if (now - lastTap < 280) {
      lastTap = 0
      setZoom(scale.value > 1 ? 1 : 2)
      return
    }
    lastTap = now
  }
  if (scale.value !== 1) return
  const delta = noticeSwipeStep(start, { x: event.clientX, y: event.clientY })
  if (delta) step(delta)
}

function onWheel(event) {
  setZoom(scale.value * (event.deltaY < 0 ? 1.15 : 1 / 1.15))
}

watch(
  () => props.start,
  (value) => {
    index.value = Math.min(Math.max(0, value), Math.max(0, props.urls.length - 1))
    resetZoom()
  },
  { immediate: true },
)

onMounted(() => {
  rootRef.value?.focus()
  measure()
  resizeObserver = new ResizeObserver(measure)
  if (stageRef.value) resizeObserver.observe(stageRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="rootRef"
      class="fixed inset-0 z-[80] flex flex-col bg-black text-white outline-none"
      tabindex="0"
      @keydown.esc="emit('close')"
    >
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" class="text-sm font-bold" @click="emit('close')">닫기</button>
        <span v-if="urls.length > 1" class="text-sm font-bold">{{ index + 1 }}/{{ urls.length }}</span>
        <div class="flex items-center gap-2">
          <button type="button" class="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold" @click="setZoom(scale / 1.35)">
            축소
          </button>
          <button type="button" class="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-slate-900" @click="setZoom(scale * 1.35)">
            확대
          </button>
        </div>
      </div>

      <div
        ref="stageRef"
        class="min-h-0 flex-1"
        :class="scale > 1 ? 'overflow-auto touch-pan-x touch-pan-y' : 'overflow-hidden touch-none'"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel.prevent="onWheel"
      >
        <img
          :src="urls[index]"
          alt=""
          draggable="false"
          class="mx-auto block max-w-none select-none object-contain"
          :style="imageStyle"
        />
      </div>

      <div v-if="urls.length > 1" class="flex justify-between px-4 py-3">
        <button type="button" class="text-sm font-bold disabled:opacity-40" :disabled="index === 0" @click="step(-1)">
          이전
        </button>
        <button
          type="button"
          class="text-sm font-bold disabled:opacity-40"
          :disabled="index === urls.length - 1"
          @click="step(1)"
        >
          다음
        </button>
      </div>
    </div>
  </Teleport>
</template>

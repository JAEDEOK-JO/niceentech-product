<script setup>
import { computed, onMounted, ref } from 'vue'
import { swipeStep } from './rewardPhotoSwipe.js'

const props = defineProps({
  urls: {
    type: Array,
    required: true,
  },
  labels: {
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
const index = ref(Math.min(Math.max(0, props.start), Math.max(0, props.urls.length - 1)))
const scale = ref(1)
const pan = ref({ x: 0, y: 0 })
const swipeX = ref(0)
const points = new Map()
let pinchDistance = 0
let drag = null
let swipe = null

const imageStyle = computed(() => ({
  transform: `translate(calc(-50% + ${pan.value.x + swipeX.value}px), calc(-50% + ${pan.value.y}px)) scale(${scale.value})`,
}))

const MAX_SCALE = 8

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(1, value))
}

function resetView() {
  scale.value = 1
  pan.value = { x: 0, y: 0 }
  swipeX.value = 0
  drag = null
  swipe = null
  pinchDistance = 0
}

function zoomBy(factor) {
  const next = clampScale(scale.value * factor)
  scale.value = next
  if (next === 1) pan.value = { x: 0, y: 0 }
}

function step(delta) {
  const next = index.value + delta
  if (next < 0 || next >= props.urls.length) return
  index.value = next
  resetView()
}

function onPointerDown(event) {
  try {
    event.currentTarget.setPointerCapture(event.pointerId)
  } catch {
    // 포인터가 이미 사라진 경우에는 확대만 유지한다.
  }
  points.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (points.size >= 2) {
    const [first, second] = [...points.values()]
    pinchDistance = Math.hypot(first.x - second.x, first.y - second.y)
    drag = null
    swipe = null
    swipeX.value = 0
    return
  }
  if (scale.value > 1) {
    drag = { x: event.clientX, y: event.clientY, tx: pan.value.x, ty: pan.value.y }
    return
  }
  swipe = { x: event.clientX, y: event.clientY }
}

function onPointerMove(event) {
  if (!points.has(event.pointerId)) return
  points.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (points.size >= 2) {
    const [first, second] = [...points.values()]
    const distance = Math.hypot(first.x - second.x, first.y - second.y)
    if (pinchDistance > 0 && distance > 0) scale.value = clampScale(scale.value * (distance / pinchDistance))
    pinchDistance = distance
    if (scale.value === 1) pan.value = { x: 0, y: 0 }
    return
  }
  if (swipe && scale.value === 1) {
    swipeX.value = event.clientX - swipe.x
    return
  }
  if (!drag || scale.value === 1) return
  pan.value = {
    x: drag.tx + event.clientX - drag.x,
    y: drag.ty + event.clientY - drag.y,
  }
}

function finishPointer(event, commit) {
  const start = swipe
  points.delete(event.pointerId)
  if (points.size < 2) pinchDistance = 0
  if (points.size !== 0) return
  drag = null
  swipe = null
  swipeX.value = 0
  if (!commit || !start || scale.value !== 1) return
  const delta = swipeStep(start, { x: event.clientX, y: event.clientY })
  if (delta) step(delta)
}

function onWheel(event) {
  zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15)
}

onMounted(() => {
  rootRef.value?.focus()
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
        <div class="flex items-center gap-2 text-sm font-bold">
          <span
            v-if="labels[index]"
            class="rounded-md px-1.5 py-0.5 text-xs font-extrabold"
            :class="labels[index] === '문제' ? 'bg-rose-500' : 'bg-white/20'"
          >
            {{ labels[index] }}
          </span>
          <span v-if="urls.length > 1">{{ index + 1 }}/{{ urls.length }}</span>
        </div>
      </div>

      <div
        class="relative min-h-0 flex-1 overflow-hidden"
        style="touch-action: none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="finishPointer($event, true)"
        @pointercancel="finishPointer($event, false)"
        @wheel.prevent="onWheel"
      >
        <img
          :src="urls[index]"
          alt=""
          draggable="false"
          class="pointer-events-none absolute left-1/2 top-1/2 max-h-full max-w-full select-none object-contain"
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

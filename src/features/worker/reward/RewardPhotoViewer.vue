<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  urls: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['close'])

const rootRef = ref(null)
const index = ref(0)
const scale = ref(1)
const pan = ref({ x: 0, y: 0 })
const points = new Map()
let pinchDistance = 0
let drag = null

const imageStyle = computed(() => ({
  transform: `translate(calc(-50% + ${pan.value.x}px), calc(-50% + ${pan.value.y}px)) scale(${scale.value})`,
}))

const MAX_SCALE = 8

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(1, value))
}

function resetView() {
  scale.value = 1
  pan.value = { x: 0, y: 0 }
  drag = null
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
    return
  }
  if (scale.value > 1) {
    drag = { x: event.clientX, y: event.clientY, tx: pan.value.x, ty: pan.value.y }
  }
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
  if (!drag || scale.value === 1) return
  pan.value = {
    x: drag.tx + event.clientX - drag.x,
    y: drag.ty + event.clientY - drag.y,
  }
}

function onPointerUp(event) {
  points.delete(event.pointerId)
  if (points.size < 2) pinchDistance = 0
  if (points.size === 0) drag = null
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
        <p v-if="urls.length > 1" class="text-sm font-bold">{{ index + 1 }}/{{ urls.length }}</p>
      </div>

      <div
        class="relative min-h-0 flex-1 overflow-hidden"
        style="touch-action: none"
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

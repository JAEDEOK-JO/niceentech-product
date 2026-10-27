<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'

const ROTATE_MS = 2000
const SLIDE_MS = 450

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['open'])

const index = ref(0)
const sliding = ref(false)
let rotateTimer = null
let slideTimer = null

const visibleItems = computed(() => {
  const running = props.items.filter((item) => item.state === 'running')
  return running.length > 0 ? running : props.items
})

const current = computed(() => visibleItems.value[index.value] ?? null)
const upcoming = computed(() => {
  if (visibleItems.value.length < 2 || !current.value) return null
  return visibleItems.value[(index.value + 1) % visibleItems.value.length]
})

function label(item) {
  const drawingNo = String(item?.drawingNo ?? '').trim() || '-'
  if (item?.state === 'failed') return `도번 ${drawingNo}번 수량파악 실패`
  if (item?.state === 'done' || item?.state === 'review') return `도번 ${drawingNo}번 수량파악 완료`
  return `도번 ${drawingNo}번 수량파악중`
}

function textClass(item) {
  if (item?.state === 'done' || item?.state === 'review') return 'text-emerald-700'
  if (item?.state === 'failed') return 'text-red-600'
  return 'text-sky-700'
}

function clearTimers() {
  if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = null
  }
  if (slideTimer) {
    clearTimeout(slideTimer)
    slideTimer = null
  }
}

function rotateNext() {
  if (visibleItems.value.length < 2 || sliding.value) return
  sliding.value = true
  slideTimer = window.setTimeout(() => {
    index.value = (index.value + 1) % visibleItems.value.length
    sliding.value = false
    slideTimer = null
  }, SLIDE_MS)
}

function startRotation() {
  clearTimers()
  sliding.value = false
  if (index.value >= visibleItems.value.length) index.value = 0
  if (visibleItems.value.length < 2) return
  rotateTimer = window.setInterval(rotateNext, ROTATE_MS)
}

watch(() => visibleItems.value.map((item) => `${item.id}:${item.state}`).join('|'), startRotation, { immediate: true })

onUnmounted(clearTimers)
</script>

<template>
  <button v-if="current" type="button" class="status-row" @click="emit('open')">
    <span v-if="current.state === 'running'" class="quantity-ping" aria-hidden="true"></span>
    <span v-else-if="current.state === 'done' || current.state === 'review'" class="quantity-done" aria-hidden="true">
      <svg viewBox="0 0 16 16" class="quantity-check">
        <path d="M3.8 8.2 6.6 11 12.2 4.8" />
      </svg>
    </span>
    <div class="status-window">
      <div class="status-track" :class="{ 'is-sliding': sliding }">
        <p class="status-line text-sm font-extrabold whitespace-nowrap" :class="textClass(current)">
          <span v-if="current.state === 'running'" class="quantity-shimmer">{{ label(current) }}</span>
          <template v-else>{{ label(current) }}</template>
        </p>
        <p
          v-if="upcoming"
          class="status-line text-sm font-extrabold whitespace-nowrap"
          :class="textClass(upcoming)"
        >
          <span v-if="upcoming.state === 'running'" class="quantity-shimmer">{{ label(upcoming) }}</span>
          <template v-else>{{ label(upcoming) }}</template>
        </p>
      </div>
    </div>
  </button>
</template>

<style scoped>
.status-row {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  height: 2rem;
  margin-left: 0.15rem;
  padding: 0 0 0 0.9rem;
  border: none;
  background: transparent;
  overflow: visible;
  cursor: pointer;
}

.status-window {
  height: 1.5rem;
  overflow: hidden;
}

.status-track {
  transform: translateY(0);
}

.status-track.is-sliding {
  transform: translateY(-1.5rem);
  transition: transform 0.45s ease;
}

.status-line {
  height: 1.5rem;
  line-height: 1.5rem;
}

.quantity-ping {
  position: relative;
  width: 0.5rem;
  height: 0.5rem;
  flex: none;
  border-radius: 999px;
  background: #0284c7;
  box-shadow: 0 0 0 0 rgb(2 132 199 / 0.55);
  animation: quantity-core 1.2s ease-in-out infinite;
}

.quantity-ping::after {
  content: '';
  position: absolute;
  inset: -0.28rem;
  border: 2px solid #38bdf8;
  border-radius: inherit;
  animation: quantity-ring 1.2s ease-out infinite;
}

.quantity-shimmer {
  background-image: linear-gradient(100deg, #0369a1 0%, #0369a1 32%, #e0f2fe 48%, #7dd3fc 52%, #0369a1 68%, #0369a1 100%);
  background-size: 220% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: quantity-shimmer 1.35s linear infinite;
}

@keyframes quantity-core {
  0%, 100% { transform: scale(0.85); }
  50% { transform: scale(1.15); }
}

@keyframes quantity-ring {
  0% { transform: scale(0.55); opacity: 0.9; }
  100% { transform: scale(1.85); opacity: 0; }
}

.quantity-done {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.05rem;
  height: 1.05rem;
  flex: none;
  border-radius: 999px;
  background: #059669;
  color: white;
  box-shadow: 0 0 0 4px rgb(16 185 129 / 0.2);
  animation: quantity-done-pop 0.45s cubic-bezier(0.2, 0.85, 0.2, 1);
}

.quantity-check {
  width: 0.75rem;
  height: 0.75rem;
  overflow: visible;
}

.quantity-check path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 16;
  stroke-dashoffset: 16;
  animation: quantity-check-draw 0.35s 0.12s ease forwards;
}

@keyframes quantity-shimmer {
  0% { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}

@keyframes quantity-done-pop {
  0% { transform: scale(0.35); opacity: 0; }
  65% { transform: scale(1.12); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes quantity-check-draw {
  to { stroke-dashoffset: 0; }
}

@media print {
  .status-row {
    display: none;
  }
}
</style>

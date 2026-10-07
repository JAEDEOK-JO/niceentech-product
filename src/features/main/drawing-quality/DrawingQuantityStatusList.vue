<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'

const ROTATE_MS = 2000
const SLIDE_MS = 450

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const index = ref(0)
const sliding = ref(false)
let rotateTimer = null
let slideTimer = null

const current = computed(() => props.items[index.value] ?? null)
const upcoming = computed(() => {
  if (props.items.length < 2 || !current.value) return null
  return props.items[(index.value + 1) % props.items.length]
})

function label(item) {
  const drawingNo = String(item?.drawingNo ?? '').trim() || '-'
  if (item?.state === 'failed') return `도번 ${drawingNo}번 수량파악 실패`
  if (item?.state === 'done') return `도번 ${drawingNo}번 수량파악 완료`
  return `도번 ${drawingNo}번 수량파악중`
}

function textClass(item) {
  if (item?.state === 'done') return 'text-emerald-700'
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
  if (props.items.length < 2 || sliding.value) return
  sliding.value = true
  slideTimer = window.setTimeout(() => {
    index.value = (index.value + 1) % props.items.length
    sliding.value = false
    slideTimer = null
  }, SLIDE_MS)
}

function startRotation() {
  clearTimers()
  sliding.value = false
  if (index.value >= props.items.length) index.value = 0
  if (props.items.length < 2) return
  rotateTimer = window.setInterval(rotateNext, ROTATE_MS)
}

watch(() => props.items.map((item) => item.id).join('|'), startRotation, { immediate: true })

onUnmounted(clearTimers)
</script>

<template>
  <div v-if="current" class="status-window">
    <div class="status-track" :class="{ 'is-sliding': sliding }">
      <p class="status-line text-sm font-extrabold whitespace-nowrap" :class="textClass(current)">
        {{ label(current) }}<span v-if="current.state === 'running'" class="quantity-dots" aria-hidden="true"></span>
      </p>
      <p
        v-if="upcoming"
        class="status-line text-sm font-extrabold whitespace-nowrap"
        :class="textClass(upcoming)"
      >
        {{ label(upcoming) }}<span v-if="upcoming.state === 'running'" class="quantity-dots" aria-hidden="true"></span>
      </p>
    </div>
  </div>
</template>

<style scoped>
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

.quantity-dots::after {
  display: inline-block;
  width: 1.2em;
  text-align: left;
  content: '';
  animation: quantity-dots 1.2s steps(4, end) infinite;
}

@keyframes quantity-dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
  100% { content: ''; }
}

@media print {
  .status-window {
    display: none;
  }
}
</style>

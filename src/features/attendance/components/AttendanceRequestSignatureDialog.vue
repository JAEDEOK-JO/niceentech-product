<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{
  (e: 'confirm', blob: Blob): void
  (e: 'cancel'): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let isDrawing = false
let lastX = 0
let lastY = 0
const hasDrawn = ref(false)

const CANVAS_W = 480
const CANVAS_H = 220

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

function getPos(e: MouseEvent | TouchEvent) {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  if ('touches' in e) {
    const t = e.touches[0]
    return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
  }
  return {
    x: ((e as MouseEvent).clientX - rect.left) * scaleX,
    y: ((e as MouseEvent).clientY - rect.top) * scaleY,
  }
}

function onPointerDown(e: MouseEvent | TouchEvent) {
  if (!ctx) return
  isDrawing = true
  const { x, y } = getPos(e)
  lastX = x
  lastY = y
  ctx.beginPath()
  ctx.arc(x, y, 1.2, 0, Math.PI * 2)
  ctx.fill()
  e.preventDefault()
}

function onPointerMove(e: MouseEvent | TouchEvent) {
  if (!isDrawing || !ctx) return
  const { x, y } = getPos(e)
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()
  lastX = x
  lastY = y
  hasDrawn.value = true
  e.preventDefault()
}

function onPointerUp() {
  isDrawing = false
}

function clearCanvas() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  hasDrawn.value = false
}

async function handleConfirm() {
  const canvas = canvasRef.value
  if (!canvas) return

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return
  emit('confirm', blob)
}

onMounted(() => {
  initCanvas()
})
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
    <div class="w-full max-w-lg rounded-3xl bg-white shadow-2xl">

      <!-- 헤더 -->
      <div class="border-b border-slate-100 px-6 py-5">
        <p class="text-xs font-bold uppercase tracking-widest text-slate-400">서명</p>
        <h2 class="mt-1 text-xl font-extrabold text-slate-900">본인 서명을 해주세요</h2>
      </div>

      <div class="p-6 space-y-4">

        <!-- 캔버스 -->
        <div class="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
          <canvas
            ref="canvasRef"
            :width="CANVAS_W"
            :height="CANVAS_H"
            class="block w-full touch-none cursor-crosshair"
            @mousedown="onPointerDown"
            @mousemove="onPointerMove"
            @mouseup="onPointerUp"
            @mouseleave="onPointerUp"
            @touchstart.prevent="onPointerDown"
            @touchmove.prevent="onPointerMove"
            @touchend="onPointerUp"
          />
          <span
            v-if="!hasDrawn"
            class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300"
          >
            여기에 서명하세요
          </span>
        </div>

        <!-- 지우기 -->
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
          @click="clearCanvas"
        >
          다시 그리기
        </button>

        <!-- 버튼 -->
        <div class="flex gap-3 pt-1">
          <button
            type="button"
            class="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="emit('cancel')"
          >
            취소
          </button>
          <button
            type="button"
            class="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-40"
            :disabled="!hasDrawn"
            @click="handleConfirm"
          >
            신청 완료
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

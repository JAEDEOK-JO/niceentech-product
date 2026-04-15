<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import type { ProfileItem } from '../services/attendance.service'

const props = defineProps<{
  profiles: ProfileItem[]
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', userId: string, blob: Blob): void
}>()

// ─── 프로필 선택 ───────────────────────────────────────────────────────────────
const selectedUserId = ref('')
const selectedProfile = ref<ProfileItem | null>(null)

watch(selectedUserId, (id) => {
  selectedProfile.value = props.profiles.find((p) => p.id === id) ?? null
})

// ─── 탭 ────────────────────────────────────────────────────────────────────────
const activeTab = ref<'draw' | 'upload'>('draw')

// ─── 캔버스 서명 ───────────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let isDrawing = false
let lastX = 0
let lastY = 0
let hasDrawn = ref(false)

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 2.5
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
  ctx.arc(x, y, 1, 0, Math.PI * 2)
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

async function getCanvasBlob(): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvasRef.value?.toBlob(resolve, 'image/png')
  })
}

// ─── 이미지 업로드 ─────────────────────────────────────────────────────────────
const uploadPreview = ref<string | null>(null)
const uploadFile = ref<File | null>(null)

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadFile.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { uploadPreview.value = ev.target?.result as string }
  reader.readAsDataURL(file)
}

function clearUpload() {
  uploadPreview.value = null
  uploadFile.value = null
}

// ─── 저장 ──────────────────────────────────────────────────────────────────────
async function handleSave() {
  if (!selectedUserId.value) return

  let blob: Blob | null = null

  if (activeTab.value === 'draw') {
    blob = await getCanvasBlob()
  } else {
    if (!uploadFile.value) return
    blob = uploadFile.value
  }

  if (!blob) return
  emit('save', selectedUserId.value, blob)
}

const canSave = () => {
  if (!selectedUserId.value) return false
  if (activeTab.value === 'draw') return hasDrawn.value
  return !!uploadFile.value
}

// 탭 전환 시 캔버스 초기화
watch(activeTab, async (tab) => {
  if (tab === 'draw') {
    await nextTick()
    initCanvas()
  }
})

onMounted(() => {
  initCanvas()
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

      <!-- 헤더 -->
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 class="font-extrabold text-slate-900">서명 관리</h2>
        <button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" @click="emit('close')">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5">

        <!-- 프로필 선택 -->
        <div>
          <label class="mb-1.5 block text-sm font-bold text-slate-700">서명 대상</label>
          <select
            v-model="selectedUserId"
            class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">-- 선택 --</option>
            <option v-for="p in profiles" :key="p.id" :value="p.id">
              {{ p.name }}{{ p.signaturePath ? ' ✓' : '' }}
            </option>
          </select>
          <!-- 현재 서명 미리보기 -->
          <div v-if="selectedProfile?.signaturePath" class="mt-2 flex items-center gap-2">
            <span class="text-xs text-slate-400">현재 서명:</span>
            <img :src="selectedProfile.signaturePath" alt="현재 서명" class="h-8 object-contain" />
          </div>
        </div>

        <!-- 탭 -->
        <div class="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-sm font-bold transition-colors"
            :class="activeTab === 'draw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
            @click="activeTab = 'draw'"
          >마우스 서명</button>
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-sm font-bold transition-colors"
            :class="activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
            @click="activeTab = 'upload'"
          >이미지 업로드</button>
        </div>

        <!-- 캔버스 서명 -->
        <div v-show="activeTab === 'draw'">
          <div class="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
            <canvas
              ref="canvasRef"
              width="460"
              height="180"
              class="block w-full touch-none cursor-crosshair"
              @mousedown="onPointerDown"
              @mousemove="onPointerMove"
              @mouseup="onPointerUp"
              @mouseleave="onPointerUp"
              @touchstart.prevent="onPointerDown"
              @touchmove.prevent="onPointerMove"
              @touchend="onPointerUp"
            />
            <span v-if="!hasDrawn" class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300">
              여기에 서명하세요
            </span>
          </div>
          <button
            type="button"
            class="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
            @click="clearCanvas"
          >지우기</button>
        </div>

        <!-- 이미지 업로드 -->
        <div v-show="activeTab === 'upload'" class="space-y-3">
          <label
            class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-sm text-slate-400 hover:border-slate-400"
          >
            <svg class="mb-2 h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            이미지 파일 선택 (PNG, JPG)
            <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
          </label>
          <div v-if="uploadPreview" class="relative">
            <img :src="uploadPreview" alt="미리보기" class="mx-auto max-h-32 rounded-lg border border-slate-200 object-contain" />
            <button
              type="button"
              class="absolute right-1 top-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-red-500 shadow hover:bg-red-50"
              @click="clearUpload"
            >✕</button>
          </div>
        </div>

        <!-- 저장 버튼 -->
        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="emit('close')"
          >취소</button>
          <button
            type="button"
            class="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-40"
            :disabled="!canSave() || saving"
            @click="handleSave"
          >
            {{ saving ? '저장 중...' : '저장' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

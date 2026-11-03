<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { createGuestLink, type GuestLink } from './guestLink'

const props = defineProps<{
  userId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const link = ref<GuestLink | null>(null)
const imageUrl = ref('')
const remainingLabel = ref('')
const errorMessage = ref('')
const creating = ref(false)
let timer = 0

const formatRemaining = (expiresAt: number) => {
  const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

const refreshRemaining = () => {
  if (!link.value) return
  remainingLabel.value = formatRemaining(link.value.expiresAt)
  if (link.value.expiresAt <= Date.now()) {
    imageUrl.value = ''
    remainingLabel.value = '00:00'
  }
}

async function createLink() {
  creating.value = true
  errorMessage.value = ''
  imageUrl.value = ''
  try {
    const next = await createGuestLink(props.userId)
    link.value = next
    imageUrl.value = await QRCode.toDataURL(next.url, { margin: 1, width: 280 })
    refreshRemaining()
  } catch (error) {
    link.value = null
    errorMessage.value = error instanceof Error ? error.message : 'QR을 만들지 못했습니다.'
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  void createLink()
  timer = window.setInterval(refreshRemaining, 1000)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
      <h2 class="text-lg font-extrabold text-slate-900">휴대폰 신청</h2>
      <div class="mt-4 flex min-h-72 items-center justify-center rounded-xl bg-slate-50">
        <img v-if="imageUrl" :src="imageUrl" alt="휴대폰 신청 QR" class="h-72 w-72" />
        <p v-else-if="creating" class="text-sm font-bold text-slate-400">만드는 중</p>
        <p v-else class="px-4 text-center text-sm font-bold text-red-500">{{ errorMessage || '사용할 수 없습니다' }}</p>
      </div>
      <p v-if="imageUrl" class="mt-3 text-center text-2xl font-extrabold text-slate-900">{{ remainingLabel }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          @click="emit('close')"
        >
          닫기
        </button>
        <button
          type="button"
          class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          :disabled="creating"
          @click="createLink"
        >
          다시 만들기
        </button>
      </div>
    </div>
  </div>
</template>

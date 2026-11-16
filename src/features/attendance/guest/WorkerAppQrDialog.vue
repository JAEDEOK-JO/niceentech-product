<script setup lang="ts">
import { onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { workerSiteUrl } from '@/features/worker/workerSiteUrl'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const imageUrl = ref('')
const failed = ref(false)

onMounted(async () => {
  try {
    imageUrl.value = await QRCode.toDataURL(workerSiteUrl(), { margin: 1, width: 280 })
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="emit('close')"
    >
      <section class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-extrabold text-slate-900">작업자 어플</h2>
          <button type="button" class="text-sm font-bold text-slate-500" @click="emit('close')">닫기</button>
        </div>
        <div class="flex min-h-64 items-center justify-center">
          <img v-if="imageUrl" :src="imageUrl" alt="" class="h-64 w-64" />
          <div
            v-else-if="!failed"
            class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700"
          />
          <p v-else class="text-sm font-bold text-red-500">QR을 만들지 못했습니다.</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>

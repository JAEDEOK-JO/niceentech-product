<script setup lang="ts">
import { onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { workerSiteUrl } from '@/features/worker/workerSiteUrl'

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
  <section class="rounded-2xl border border-slate-200 bg-white p-6">
    <h2 class="text-base font-extrabold text-slate-900">작업자 어플 다운로드</h2>
    <div class="mt-4 flex min-h-64 items-center justify-center">
      <img v-if="imageUrl" :src="imageUrl" alt="" class="h-64 w-64" />
      <div
        v-else-if="!failed"
        class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700"
      />
      <p v-else class="text-sm font-bold text-red-500">QR을 만들지 못했습니다.</p>
    </div>
  </section>
</template>

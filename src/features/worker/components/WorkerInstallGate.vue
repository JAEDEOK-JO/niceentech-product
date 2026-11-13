<script setup>
import { isIosBrowser } from '../pwa/workerDisplayMode'
import { useWorkerInstall } from '../pwa/useWorkerInstall'

const ios = isIosBrowser()
const { canInstall, install } = useWorkerInstall()
</script>

<template>
  <section class="mx-auto flex min-h-dvh w-full max-w-[480px] items-center bg-slate-200 px-6">
    <div class="w-full rounded-2xl bg-white p-8 text-center">
      <h1 class="text-xl font-extrabold text-slate-900">다운로드</h1>
      <button
        v-if="canInstall"
        type="button"
        class="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white"
        @click="install"
      >
        다운로드
      </button>
      <p v-else-if="ios" class="mt-6 text-sm font-bold text-slate-700">홈 화면에 추가</p>
    </div>
  </section>
</template>

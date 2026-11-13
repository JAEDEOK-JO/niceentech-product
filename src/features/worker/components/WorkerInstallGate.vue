<script setup>
import { isIosBrowser } from '../pwa/workerDisplayMode'
import { useWorkerInstall } from '../pwa/useWorkerInstall'
import WorkerIosInstall from './WorkerIosInstall.vue'

const ios = isIosBrowser()
const { install } = useWorkerInstall()
</script>

<template>
  <WorkerIosInstall v-if="ios" />
  <section v-else class="mx-auto flex min-h-dvh w-full max-w-[480px] items-center justify-center bg-slate-200 px-6">
    <button
      type="button"
      class="rounded-full border-2 border-slate-900 bg-white px-10 py-3 text-base font-extrabold text-slate-900 shadow-md select-none active:translate-y-0.5 active:bg-slate-900 active:text-white"
      @click="install"
    >
      다운로드
    </button>
  </section>
</template>

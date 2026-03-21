<script setup>
import packageJson from '../../package.json'

const appVersion = packageJson.version
const runtimePlatform = window.desktop?.platform ?? 'web'
</script>

<template>
  <main class="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-6 md:px-6">
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-2">
          <p class="text-sm font-bold text-slate-500">설정</p>
          <h1 class="text-2xl font-extrabold text-slate-900">앱 정보</h1>
          <p class="text-sm text-slate-600">현재 설치된 NICEENTECH 앱의 버전 정보를 확인할 수 있습니다.</p>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="grid gap-3 sm:grid-cols-2">
          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">앱 버전</p>
            <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ appVersion }}</p>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">실행 환경</p>
            <p class="mt-2 text-2xl font-extrabold text-slate-900">{{ runtimePlatform }}</p>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

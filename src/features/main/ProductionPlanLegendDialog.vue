<script setup>
defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const badges = [
  { label: '증지만듦', className: 'border-yellow-300 bg-yellow-200 text-yellow-900' },
  { label: '배포확인', className: 'border-blue-300 bg-blue-300 text-blue-950' },
  { label: '산출완료', className: 'border-lime-200 bg-lime-100 text-lime-900' },
  { label: '도면배포', className: 'border-slate-300 bg-slate-100 text-slate-700' },
  { label: '보류', className: 'border-orange-200 bg-orange-100 text-orange-900' },
  { label: '나사', className: 'border-orange-200 bg-orange-100 text-orange-800' },
  { label: '민뚜라', className: 'border-cyan-300 bg-cyan-200 text-cyan-950' },
  { label: '진민택', className: 'border-fuchsia-300 bg-fuchsia-200 text-fuchsia-950' },
  { label: 'CNC', className: 'border-violet-300 bg-violet-200 text-violet-950' },
]
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-base font-extrabold text-slate-900">색상정보</h2>
        <button type="button" class="text-sm font-bold text-slate-400 hover:text-slate-600" @click="emit('close')">닫기</button>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="badge in badges"
          :key="badge.label"
          class="inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
          :class="badge.className"
        >
          {{ badge.label }}
        </span>
      </div>
    </div>
  </div>
</template>

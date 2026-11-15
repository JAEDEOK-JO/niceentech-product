<script setup>
defineProps({
  name: {
    type: String,
    default: '',
  },
  department: {
    type: String,
    default: '',
  },
  month: {
    type: String,
    default: '',
  },
  stats: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <section class="rounded-2xl border border-amber-100 bg-amber-50 p-4">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-xs font-bold text-amber-700">{{ department }}</p>
        <p class="mt-0.5 truncate text-lg font-extrabold text-slate-900">{{ name }}</p>
      </div>
      <div class="shrink-0 text-right">
        <p class="text-[11px] font-bold text-amber-700">{{ month }} 포상금</p>
        <p class="mt-0.5 text-2xl font-extrabold text-amber-700">
          {{ stats.amount.toLocaleString('ko-KR') }}<span class="ml-0.5 text-sm">원</span>
        </p>
      </div>
    </div>

    <dl class="mt-3 grid grid-cols-3 border-t border-amber-200 pt-3 text-center">
      <div>
        <dt class="text-[11px] font-bold text-amber-700">승인</dt>
        <dd class="mt-0.5 text-sm font-extrabold text-slate-900">{{ stats.approved }}건</dd>
      </div>
      <div>
        <dt class="text-[11px] font-bold text-amber-700">대기</dt>
        <dd class="mt-0.5 text-sm font-extrabold text-slate-900">{{ stats.pending }}건</dd>
      </div>
      <div>
        <dt class="text-[11px] font-bold text-amber-700">반려</dt>
        <dd class="mt-0.5 text-sm font-extrabold text-slate-900">{{ stats.rejected }}건</dd>
      </div>
    </dl>
  </section>
</template>

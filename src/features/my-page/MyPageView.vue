<script setup>
import Button from '@/components/ui/button/Button.vue'

defineProps({
  profile: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['go-home', 'logout'])
</script>

<template>
  <section class="min-h-screen w-full">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div class="flex items-center justify-between px-6 py-2.5">
        <h1 class="text-lg font-bold text-slate-900">내정보</h1>
        <Button class="h-9 px-3 text-xs" variant="outline" @click="emit('go-home')">메인으로</Button>
      </div>
    </header>

    <div class="px-6 py-6">
      <div class="mx-auto max-w-[640px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        
        <div class="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
          <div class="font-semibold text-slate-500">이름</div>
          <div class="font-semibold text-slate-900">{{ profile?.name || '-' }}</div>
          <div class="font-semibold text-slate-500">직급</div>
          <div class="font-semibold text-slate-900">{{ profile?.position || '-' }}</div>
          <div class="font-semibold text-slate-500">부서</div>
          <div class="font-semibold text-slate-900">{{ profile?.department || '-' }}</div>
          <div class="font-semibold text-slate-500">작업라인</div>
          <div class="font-semibold text-slate-900">{{ profile?.work_man || '없음' }}</div>
        </div>
        <div class="mt-8">
          <Button variant="outline" @click="emit('logout')">로그아웃</Button>
        </div>
      </div>
    </div>
  </section>
</template>

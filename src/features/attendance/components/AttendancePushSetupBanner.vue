<script setup lang="ts">
defineProps<{
  iosNeedsInstall: boolean
}>()

const emit = defineEmits<{
  (e: 'enable'): void
}>()
</script>

<template>
  <div class="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
    <p v-if="iosNeedsInstall" class="text-sm font-bold text-amber-900">
      iPhone은 Safari에서 홈 화면에 추가한 뒤, 설정에서 알림을 켜주세요.
    </p>
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-bold text-amber-900">휴가 신청 푸시 알림</p>
        <button
          type="button"
          class="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-700"
          @click="emit('enable')"
        >
          알림 켜기
        </button>
      </div>
    </template>
  </div>
</template>

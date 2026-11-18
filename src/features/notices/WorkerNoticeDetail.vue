<script setup>
import NoticeCheckGrid from './NoticeCheckGrid.vue'
import NoticeImage from './NoticeImage.vue'
import { noticeWhen } from './noticeFormat'

defineProps({
  notice: {
    type: Object,
    required: true,
  },
  workers: {
    type: Array,
    default: () => [],
  },
  userId: {
    type: String,
    default: '',
  },
  confirming: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['back', 'confirm'])
</script>

<template>
  <div class="flex min-h-full flex-col gap-4 px-4 py-4">
    <div class="flex items-center gap-3">
      <button type="button" class="text-sm font-bold text-slate-500" @click="emit('back')">뒤로</button>
      <h2 class="text-lg font-extrabold text-slate-900">공지사항</h2>
    </div>
    <article class="rounded-2xl border border-slate-200 bg-white p-4">
      <p class="text-xs font-bold text-slate-400">{{ noticeWhen(notice.created_at) }}</p>
      <p class="mt-2 break-words text-sm font-bold leading-6 text-slate-900">{{ notice.body }}</p>
      <NoticeImage v-if="notice.imageUrls?.length" class="mt-3" :urls="notice.imageUrls" large />
    </article>
    <NoticeCheckGrid :workers="workers" :checked-ids="notice.checkedUserIds" />
    <div v-if="userId" class="mt-auto pt-2">
      <p v-if="message && !notice.checkedUserIds.includes(userId)" class="mb-2 text-center text-sm font-bold text-red-500">{{ message }}</p>
      <button
        type="button"
        class="w-full rounded-xl py-2.5 text-sm font-extrabold disabled:cursor-default"
        :class="notice.checkedUserIds.includes(userId) ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white disabled:opacity-40'"
        :disabled="confirming || notice.checkedUserIds.includes(userId)"
        @click="emit('confirm')"
      >
        {{ notice.checkedUserIds.includes(userId) ? '확인완료' : '확인했습니다' }}
      </button>
    </div>
  </div>
</template>

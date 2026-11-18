<script setup>
import NoticeImage from './NoticeImage.vue'
import { noticeWhen } from './noticeFormat'
import { noticeCheckCount } from './noticeOrder'

defineProps({
  notices: {
    type: Array,
    default: () => [],
  },
  workers: {
    type: Array,
    default: () => [],
  },
  userId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['open'])

function needsCheck(notice, userId) {
  return Boolean(userId) && !notice.checkedUserIds.includes(userId)
}
</script>

<template>
  <section class="space-y-3 px-4 py-4">
    <h2 class="text-lg font-extrabold text-slate-900">공지사항</h2>
    <p
      v-if="notices.length === 0"
      class="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400"
    >
      내역 없음
    </p>
    <article
      v-for="notice in notices"
      :key="notice.id"
      class="rounded-2xl border border-slate-200 bg-white p-4"
      @click="emit('open', notice)"
    >
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-bold text-slate-400">{{ noticeWhen(notice.created_at) }}</p>
        <p v-if="needsCheck(notice, userId)" class="text-xs font-extrabold text-red-500">확인하세요</p>
      </div>
      <p class="mt-2 break-words text-sm font-bold leading-6 text-slate-900">{{ notice.body }}</p>
      <NoticeImage v-if="notice.imageUrls?.length" class="mt-3" :urls="notice.imageUrls" />
      <p class="mt-3 text-xs font-extrabold text-slate-500">
        확인한사람 {{ noticeCheckCount(workers, notice.checkedUserIds) }}
      </p>
    </article>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import NoticeCheckGrid from './NoticeCheckGrid.vue'
import NoticeImage from './NoticeImage.vue'
import NoticeRegisterDialog from './NoticeRegisterDialog.vue'
import { deleteNotice, fetchNoticeWorkers, fetchNotices } from './notice.service'
import { noticeWhen } from './noticeFormat'
import { noticeCheckCount } from './noticeOrder'

defineProps({
  showHeading: {
    type: Boolean,
    default: true,
  },
  headerRegister: {
    type: Boolean,
    default: false,
  },
})

const notices = ref([])
const workers = ref([])
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const selectedId = ref('')
const registerOpen = ref(false)

const selected = () => notices.value.find((notice) => notice.id === selectedId.value) ?? null

async function load() {
  loading.value = true
  message.value = ''
  try {
    const [nextNotices, nextWorkers] = await Promise.all([fetchNotices(), fetchNoticeWorkers()])
    notices.value = nextNotices
    workers.value = nextWorkers
  } catch {
    notices.value = []
    workers.value = []
    message.value = '불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function onSaved() {
  registerOpen.value = false
  await load()
}

async function remove(notice) {
  if (saving.value || !window.confirm('삭제할까요?')) return
  saving.value = true
  message.value = ''
  try {
    await deleteNotice(notice)
    if (selectedId.value === notice.id) selectedId.value = ''
    await load()
  } catch {
    message.value = '삭제에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="grid gap-5">
    <div v-if="showHeading" class="border-b border-slate-200 pb-4">
      <h1 class="text-2xl font-extrabold text-slate-900">공지사항</h1>
    </div>
    <div class="flex justify-end" :class="headerRegister ? 'hidden md:flex' : ''">
      <button
        type="button"
        class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white"
        @click="registerOpen = true"
      >
        등록
      </button>
    </div>
    <Teleport v-if="headerRegister" to="#attendance-notice-register">
      <button
        type="button"
        class="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-base font-extrabold text-white"
        @click="registerOpen = true"
      >
        등록
      </button>
    </Teleport>
    <NoticeRegisterDialog v-if="registerOpen" @close="registerOpen = false" @saved="onSaved" />
    <p v-if="message" class="text-sm font-bold text-red-500">{{ message }}</p>
    <p v-if="loading" class="text-sm font-bold text-slate-400">불러오는 중</p>
    <div v-else class="grid gap-3">
      <article
        v-for="notice in notices"
        :key="notice.id"
        class="rounded-2xl border border-slate-200 p-4"
      >
        <button type="button" class="w-full text-left" @click="selectedId = notice.id">
          <p class="text-xs font-bold text-slate-400">{{ noticeWhen(notice.created_at) }}</p>
          <p class="mt-2 break-words text-sm font-bold leading-6 text-slate-900">{{ notice.body }}</p>
          <NoticeImage v-if="notice.imageUrls?.length" class="mt-3" :urls="notice.imageUrls" />
          <p class="mt-3 text-xs font-extrabold text-slate-500">
            확인한사람 {{ noticeCheckCount(workers, notice.checkedUserIds) }}
          </p>
        </button>
        <button
          type="button"
          class="mt-3 rounded-xl border border-rose-200 px-3 py-1.5 text-sm font-extrabold text-rose-600 disabled:opacity-40"
          :disabled="saving"
          @click="remove(notice)"
        >
          삭제
        </button>
        <div v-if="selected()?.id === notice.id" class="mt-4">
          <NoticeCheckGrid :workers="workers" :checked-ids="notice.checkedUserIds" />
        </div>
      </article>
    </div>
  </section>
</template>

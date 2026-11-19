<script setup>
import { onMounted, ref } from 'vue'
import { useDialog } from '@/composables/useDialog'
import NoticeCheckGrid from './NoticeCheckGrid.vue'
import NoticeImage from './NoticeImage.vue'
import NoticeRegisterDialog from './NoticeRegisterDialog.vue'
import NoticeTranslationPicker from './NoticeTranslationPicker.vue'
import { noticeBody, noticeTextDir, noticeTitle } from './noticeLanguages'
import { deleteNotice, fetchNoticeWorkers, fetchNotices, setNoticePinned } from './notice.service'
import { NOTICE_PIN_LIMIT, isNoticePinned, noticePinCount } from './noticePin'
import { noticeWhen } from './noticeFormat'
import { noticeRequiresCheck } from './noticeCheck'
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

const { confirm } = useDialog()
const notices = ref([])
const workers = ref([])
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const selectedId = ref('')
const registerOpen = ref(false)
const languageById = ref({})

const selected = () => notices.value.find((notice) => notice.id === selectedId.value) ?? null
const pinnedCount = () => noticePinCount(notices.value)

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

async function pin(notice) {
  if (saving.value) return
  const next = !isNoticePinned(notice)
  if (next && pinnedCount() >= NOTICE_PIN_LIMIT) {
    message.value = '고정은 5개까지입니다.'
    return
  }
  saving.value = true
  message.value = ''
  try {
    await setNoticePinned(notice, next)
    await load()
  } catch (error) {
    message.value = error?.message === '고정은 5개까지입니다.' ? error.message : '고정에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function remove(notice) {
  if (saving.value) return
  const ok = await confirm('삭제할까요?', { confirmText: '삭제', cancelText: '취소' })
  if (!ok) return
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
    <NoticeRegisterDialog v-if="registerOpen" :pinned-count="pinnedCount()" @close="registerOpen = false" @saved="onSaved" />
    <p v-if="message" class="text-sm font-bold text-red-500">{{ message }}</p>
    <p v-if="loading" class="text-sm font-bold text-slate-400">불러오는 중</p>
    <div v-else class="grid gap-3">
      <article
        v-for="notice in notices"
        :key="notice.id"
        class="rounded-2xl border p-4"
        :class="isNoticePinned(notice) ? 'border-slate-900' : 'border-slate-200'"
      >
        <button type="button" class="w-full text-left" @click="selectedId = selected()?.id === notice.id ? '' : notice.id">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-bold text-slate-400">{{ noticeWhen(notice.created_at) }}</p>
            <p v-if="isNoticePinned(notice)" class="text-xs font-extrabold text-slate-900">고정</p>
          </div>
          <p class="mt-2 break-words text-sm font-extrabold leading-6 text-slate-900">
            {{ noticeTitle(notice) }}
          </p>
        </button>
        <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-extrabold text-slate-700 disabled:opacity-40"
          :disabled="saving"
          @click="pin(notice)"
        >
          {{ isNoticePinned(notice) ? '해제' : '고정' }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-rose-200 px-3 py-1.5 text-sm font-extrabold text-rose-600 disabled:opacity-40"
          :disabled="saving"
          @click="remove(notice)"
        >
          삭제
        </button>
        </div>
        <div v-if="selected()?.id === notice.id" class="mt-4 grid gap-3">
          <p class="break-words text-sm font-bold leading-6 text-slate-900" :dir="noticeTextDir(languageById[notice.id])">
            {{ noticeBody(notice, languageById[notice.id]) }}
          </p>
          <NoticeTranslationPicker
            :translations="notice.translations"
            :model-value="languageById[notice.id] || ''"
            @update:model-value="languageById[notice.id] = $event"
          />
          <NoticeImage v-if="notice.imageUrls?.length" :urls="notice.imageUrls" />
          <p v-if="noticeRequiresCheck(notice)" class="text-xs font-extrabold text-slate-500">
            확인한사람 {{ noticeCheckCount(workers, notice.checkedUserIds) }}
          </p>
          <NoticeCheckGrid v-if="noticeRequiresCheck(notice)" :workers="workers" :checked-ids="notice.checkedUserIds" />
        </div>
      </article>
    </div>
  </section>
</template>

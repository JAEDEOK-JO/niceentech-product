<script setup>
import { ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'

defineProps({
  notifications: { type: Array, default: () => [] },
  requests: { type: Array, default: () => [] },
  feedbackMap: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  unreadCount: { type: Number, default: 0 },
  activeTab: { type: String, default: 'request' },
  selectedTestDate: { type: String, default: '' },
  currentUserId: { type: String, default: '' },
  currentWorkMan: { type: String, default: '' },
  canReplyRequest: { type: Function, default: () => false },
  canDeleteRequest: { type: Function, default: () => false },
})

const emit = defineEmits([
  'go-home',
  'refresh',
  'mark-all-read',
  'mark-read',
  'submit-feedback',
  'delete-request',
  'mark-completed',
  'change-tab',
  'move-week',
  'reset-week',
])
const feedbackDrafts = ref({})

const formatDateTime = (value) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const y = String(d.getFullYear()).padStart(4, '0')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${hh}:${mm}`
}

const formatPerson = (name, meta) => {
  const safeName = String(name ?? '').trim() || '-'
  const safeMeta = String(meta ?? '').trim()
  if (!safeMeta || safeMeta === '-' || safeMeta === '없음') return safeName
  return `${safeName} (${safeMeta})`
}

const requestTypeClass = (requestType) => {
  const text = String(requestType ?? '').trim()
  if (text === '도면없음') return 'bg-rose-100 text-rose-700'
  if (text === '증지없음') return 'bg-amber-100 text-amber-700'
  return 'bg-indigo-100 text-indigo-700'
}

const statusClass = (status) => {
  const text = String(status ?? '').trim()
  if (text === '처리완료') return 'bg-emerald-100 text-emerald-700'
  if (text === '확인중') return 'bg-blue-100 text-blue-700'
  return 'bg-violet-100 text-violet-700'
}

const submitFeedback = (requestId) => {
  const message = String(feedbackDrafts.value[requestId] ?? '').trim()
  if (!message) return
  emit('submit-feedback', {
    requestId,
    message,
    onResult: (result) => {
      if (result?.ok) {
        feedbackDrafts.value[requestId] = ''
      }
    },
  })
}

const deleteRequest = (requestId) => {
  emit('delete-request', { requestId })
}

const markCompleted = (requestId) => {
  const message = String(feedbackDrafts.value[requestId] ?? '').trim()
  emit('mark-completed', {
    requestId,
    message,
    onResult: (result) => {
      if (result?.ok) {
        feedbackDrafts.value[requestId] = ''
      }
    },
  })
}
</script>

<template>
  <section class="min-h-screen w-full bg-slate-50">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div class="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div class="flex items-center gap-2">
          <Button class="h-9 px-3 text-xs" variant="outline" @click="emit('go-home')">홈으로</Button>
          <h1 class="text-lg font-bold text-slate-900">요청/알림</h1>
          <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">미확인 {{ unreadCount }}건</span>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <Button class="h-8 px-2 text-xs" variant="outline" @click="emit('move-week', -1)">지난주</Button>
          <Button class="h-8 px-2 text-xs" variant="outline" @click="emit('reset-week')">이번주</Button>
          <Button class="h-8 px-2 text-xs" variant="outline" @click="emit('move-week', 1)">다음주</Button>
          <span class="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
            {{ selectedTestDate }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Button class="h-9 px-3 text-xs" variant="outline" @click="emit('refresh')">새로고침</Button>
          <Button class="h-9 px-3 text-xs" @click="emit('mark-all-read')">전체 읽음</Button>
        </div>
      </div>
    </header>

    <div class="mx-auto w-full max-w-5xl px-4 py-4">
      <div class="mb-2 flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-bold"
          :class="activeTab === 'request' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'"
          @click="emit('change-tab', 'request')"
        >
          요청알림
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-bold"
          :class="activeTab === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'"
          @click="emit('change-tab', 'completed')"
        >
          완료알림
        </button>
      </div>
      <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">알림 로딩 중...</div>
      <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{{ error }}</div>
      <div v-else-if="requests.length === 0" class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        등록된 요청이 없습니다.
      </div>
      <div v-else class="space-y-2">
        <article
          v-for="request in requests"
          :key="request.id"
          class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="requestTypeClass(request.request_type)">
              {{ request.request_type }}
            </span>
            <span class="rounded-full px-2 py-0.5 text-[11px] font-bold" :class="statusClass(request.request_status)">
              {{ request.request_status }}
            </span>
            <span class="text-xs text-slate-500">{{ formatDateTime(request.created_at) }}</span>
          </div>

          <div class="mt-1.5 grid grid-cols-1 gap-x-3 gap-y-1 text-xs text-slate-700 md:grid-cols-2">
            <p class="truncate"><strong>현장:</strong> {{ request.company || '-' }} / {{ request.place || '-' }} / {{ request.area || '-' }}</p>
            <p><strong>검수날짜:</strong> {{ request.test_date || '-' }}</p>
            <p class="truncate"><strong>요청자:</strong> {{ formatPerson(request.requester_name, request.requester_work_man) }}</p>
            <p class="truncate"><strong>담당자:</strong> {{ formatPerson(request.assigned_name, request.assigned_work_man) }}</p>
            <p class="md:col-span-2"><strong>내용:</strong> {{ request.request_message || '-' }}</p>
          </div>

          <div class="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            <p class="mb-1 text-[11px] font-bold text-slate-700">답변</p>
            <div v-if="(feedbackMap[request.id] ?? []).length === 0" class="text-xs text-slate-500">아직 답변이 없습니다.</div>
            <div v-else class="space-y-1.5">
              <div
                v-for="fb in feedbackMap[request.id]"
                :key="fb.id"
                class="rounded-md border px-2 py-1 text-xs"
                :class="fb.is_admin_reply ? 'border-violet-200 bg-violet-50 text-violet-900' : 'border-slate-200 bg-white text-slate-700'"
              >
                <p class="font-bold">
                  {{ formatPerson(fb.author_name, fb.author_work_man) }}
                  <span v-if="fb.is_admin_reply" class="ml-1 rounded bg-violet-100 px-1 py-0.5 text-[10px]">관리자 답변</span>
                </p>
                <p class="mt-1 whitespace-pre-wrap">{{ fb.message }}</p>
                <p class="mt-1 text-[10px] text-slate-500">{{ formatDateTime(fb.created_at) }}</p>
              </div>
            </div>
          </div>

          <div v-if="canReplyRequest(request)" class="mt-2">
            <div v-if="activeTab === 'request'">
              <textarea
                v-model="feedbackDrafts[request.id]"
                class="min-h-[56px] w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="담당자/관리자 답변 입력"
              />
              <div class="mt-1.5 flex justify-end gap-2">
                <Button class="h-8 px-3 text-xs" variant="outline" @click="markCompleted(request.id)">
                  답변완료
                </Button>
                <Button class="h-8 px-3 text-xs" @click="submitFeedback(request.id)">답변 등록</Button>
              </div>
            </div>
          </div>
          <p v-else class="mt-2 text-xs font-semibold text-slate-500">지정 담당자 또는 관리자만 처리할 수 있습니다.</p>

          <div v-if="canDeleteRequest(request)" class="mt-1.5 flex justify-end">
            <Button class="h-8 px-3 text-xs text-red-600" variant="outline" @click="deleteRequest(request.id)">
              삭제
            </Button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useDialog } from '@/composables/useDialog'
import { deleteChatbotNote, fetchChatbotNotes } from '@/features/settings/services/chatbotNotes.service'

const { confirm } = useDialog()

const KIND_LABELS = { value: '저장 값', learned: '학습' }

const loading = ref(false)
const deletingId = ref(null)
const errorMessage = ref('')
const notes = ref([])

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (number) => String(number).padStart(2, '0')
  return `${String(date.getFullYear()).slice(2)}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function loadNotes() {
  loading.value = true
  errorMessage.value = ''
  try {
    notes.value = await fetchChatbotNotes()
  } catch {
    errorMessage.value = '메모를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function handleDelete(note) {
  if (deletingId.value) return
  if (!await confirm('삭제하시겠습니까?')) return
  deletingId.value = note.id
  errorMessage.value = ''
  try {
    await deleteChatbotNote(note.id)
    notes.value = notes.value.filter((item) => item.id !== note.id)
  } catch {
    errorMessage.value = '삭제하지 못했습니다.'
  } finally {
    deletingId.value = null
  }
}

onMounted(loadNotes)
</script>

<template>
  <div class="grid gap-5">
    <div class="flex items-end justify-between gap-3 border-b border-slate-200 pb-4">
      <div>
        <p class="text-sm font-bold text-slate-500">챗봇</p>
        <h1 class="mt-1 text-2xl font-extrabold text-slate-900">챗봇 메모</h1>
      </div>
      <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500">{{ notes.length }}개</span>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-slate-50 py-12 text-center text-sm font-bold text-slate-400">
      불러오는 중입니다.
    </div>

    <div v-else class="grid gap-2">
      <article
        v-for="note in notes"
        :key="note.id"
        class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-extrabold"
              :class="note.kind === 'value' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'"
            >
              {{ KIND_LABELS[note.kind] || note.kind }}
            </span>
            <span class="text-xs font-extrabold text-slate-700">{{ note.topic }}</span>
            <span class="text-[11px] font-bold text-slate-400">{{ formatDate(note.updated_at) }}</span>
            <span class="text-[11px] font-bold text-slate-400">사용 {{ note.hit_count }}회</span>
          </div>
          <p class="mt-1.5 whitespace-pre-wrap break-words text-sm font-bold text-slate-800">{{ note.note }}</p>
          <div v-if="note.keywords?.length" class="mt-1.5 flex flex-wrap gap-1">
            <span
              v-for="word in note.keywords"
              :key="word"
              class="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-500"
            >
              {{ word }}
            </span>
          </div>
          <p v-if="note.source_question" class="mt-1.5 truncate text-xs font-bold text-slate-400">{{ note.source_question }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-extrabold text-red-500 disabled:opacity-40"
          :disabled="deletingId === note.id"
          @click="handleDelete(note)"
        >
          삭제
        </button>
      </article>

      <div
        v-if="notes.length === 0"
        class="rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm font-bold text-slate-400"
      >
        등록된 메모가 없습니다.
      </div>
    </div>
  </div>
</template>

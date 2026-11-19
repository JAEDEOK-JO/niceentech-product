<script setup>
import { onUnmounted, ref } from 'vue'
import NoticeImage from './NoticeImage.vue'
import NoticeTranslationFields from './NoticeTranslationFields.vue'
import { noticeImageFiles } from './noticeImage'
import { createNotice } from './notice.service'

const emit = defineEmits(['close', 'saved'])

const title = ref('')
const body = ref('')
const translations = ref({})
const requiresCheck = ref(true)
const imageFiles = ref([])
const imagePreviews = ref([])
const saving = ref(false)
const message = ref('')

function clearImages() {
  for (const url of imagePreviews.value) URL.revokeObjectURL(url)
  imageFiles.value = []
  imagePreviews.value = []
}

function pickImages(event) {
  const files = noticeImageFiles(event.target.files)
  event.target.value = ''
  clearImages()
  imageFiles.value = files
  imagePreviews.value = files.map((file) => URL.createObjectURL(file))
}

async function submit() {
  if (saving.value || !title.value.trim() || !body.value.trim()) return
  saving.value = true
  message.value = ''
  try {
    await createNotice(title.value, body.value, imageFiles.value, requiresCheck.value, translations.value)
    clearImages()
    title.value = ''
    body.value = ''
    translations.value = {}
    requiresCheck.value = true
    emit('saved')
  } catch {
    message.value = '등록에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

function close() {
  if (saving.value) return
  emit('close')
}

onUnmounted(clearImages)
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4">
      <section class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 class="text-lg font-extrabold text-slate-900">공지 등록</h2>
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-extrabold text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            :disabled="saving"
            @click="close"
          >
            닫기
          </button>
        </header>
        <div class="grid gap-4 overflow-y-auto px-5 py-5">
          <input
            v-model="title"
            placeholder="제목"
            class="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
            :disabled="saving"
          />
          <textarea
            v-model="body"
            rows="6"
            placeholder="내용"
            class="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400"
            :disabled="saving"
          />
          <div class="flex items-center gap-3">
            <label class="w-fit cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold text-slate-700">
              이미지
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                class="hidden"
                :disabled="saving"
                @change="pickImages"
              />
            </label>
            <button
              v-if="imagePreviews.length"
              type="button"
              class="text-sm font-bold text-slate-500"
              :disabled="saving"
              @click="clearImages"
            >
              지우기
            </button>
          </div>
          <NoticeImage v-if="imagePreviews.length" :urls="imagePreviews" />
          <NoticeTranslationFields v-model="translations" :disabled="saving" />
          <label class="flex items-center gap-2 text-sm font-extrabold text-slate-800">
            <input v-model="requiresCheck" type="checkbox" class="h-4 w-4 accent-slate-900" :disabled="saving" />
            확인 받기
          </label>
          <p v-if="message" class="text-sm font-bold text-red-500">{{ message }}</p>
        </div>
        <footer class="border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            class="w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white disabled:opacity-40"
            :disabled="saving || !title.trim() || !body.trim()"
            @click="submit"
          >
            {{ saving ? '등록 중' : '등록' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

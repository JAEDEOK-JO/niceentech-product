<script setup>
import { computed, ref } from 'vue'
import RewardPhotoPicker from './RewardPhotoPicker.vue'
import { submitRewardReport } from './reward.service'

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['cancel', 'submitted'])

const submitting = ref(false)
const message = ref('')
const note = ref('')
const normalPhotos = ref([])
const problemPhotos = ref([])

const canSubmit = computed(() => note.value.trim() && !submitting.value)

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  message.value = ''
  try {
    await submitRewardReport(props.userId, {
      normalFiles: normalPhotos.value.map((photo) => photo.file),
      problemFiles: problemPhotos.value.map((photo) => photo.file),
      originalNote: '',
      foundNote: note.value,
    })
    emit('submitted')
  } catch {
    message.value = '제출에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bg-white px-4 py-4">
    <div class="mb-5 flex items-center gap-3">
      <button type="button" class="text-sm font-bold text-slate-500" :disabled="submitting" @click="emit('cancel')">
        뒤로
      </button>
      <h2 class="text-lg font-extrabold text-slate-900">등록</h2>
    </div>

    <label class="text-sm font-extrabold text-slate-900">내용</label>
    <textarea
      v-model="note"
      rows="3"
      class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      :disabled="submitting"
    />

    <div class="mt-3 space-y-3">
      <section class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p class="text-sm font-extrabold text-slate-700">정상</p>
        <RewardPhotoPicker v-model="normalPhotos" :disabled="submitting" />
      </section>
      <section class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p class="text-sm font-extrabold text-slate-900">문제</p>
        <RewardPhotoPicker v-model="problemPhotos" :disabled="submitting" />
      </section>
    </div>

    <button
      type="button"
      class="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white disabled:opacity-40"
      :disabled="!canSubmit"
      @click="submit"
    >
      {{ submitting ? '제출 중' : '제출' }}
    </button>
    <p v-if="message" class="mt-3 text-center text-sm font-bold text-red-500">{{ message }}</p>
  </div>
</template>

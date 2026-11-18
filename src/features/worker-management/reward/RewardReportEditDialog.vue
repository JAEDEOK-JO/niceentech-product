<script setup>
import { computed, ref } from 'vue'
import RewardPhotoPicker from '@/features/worker/reward/RewardPhotoPicker.vue'
import { existingRewardPhotos, problemPathsOf } from '@/features/worker/reward/rewardOwner'
import { updateRewardReport } from './rewardAdminEdit.service'

const props = defineProps({
  report: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'saved'])

const saving = ref(false)
const message = ref('')
const note = ref(props.report.found_note || '')
const normalPhotos = ref(existingRewardPhotos(props.report.normalPhotoUrls, props.report.normal_photo_paths))
const problemPhotos = ref(existingRewardPhotos(props.report.problemPhotoUrls, problemPathsOf(props.report)))
const canSave = computed(() => note.value.trim() && !saving.value)

function close() {
  if (saving.value) return
  emit('close')
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  message.value = ''
  try {
    await updateRewardReport(props.report, {
      normalPhotos: normalPhotos.value,
      problemPhotos: problemPhotos.value,
      foundNote: note.value,
    })
    emit('saved')
  } catch {
    message.value = '수정에 실패했습니다.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4">
      <section class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 class="text-lg font-extrabold text-slate-900">수정</h2>
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
          <p class="text-sm font-extrabold text-slate-900">{{ report.name }}</p>
          <textarea
            v-model="note"
            rows="4"
            class="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400"
            :disabled="saving"
          />
          <section class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-sm font-extrabold text-slate-700">정상</p>
            <RewardPhotoPicker v-model="normalPhotos" :disabled="saving" />
          </section>
          <section class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-sm font-extrabold text-slate-900">문제</p>
            <RewardPhotoPicker v-model="problemPhotos" :disabled="saving" />
          </section>
          <p v-if="message" class="text-sm font-bold text-red-500">{{ message }}</p>
        </div>
        <footer class="border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            class="w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white disabled:opacity-40"
            :disabled="!canSave"
            @click="save"
          >
            {{ saving ? '저장 중' : '저장' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

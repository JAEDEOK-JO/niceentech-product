<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  ATTENDANCE_EVIDENCE_MAX,
  canAddEvidence,
  isAllowedEvidenceFile,
  uploadAttendanceEvidenceFiles,
} from '../utils/attendanceEvidence'

const props = defineProps<{
  modelValue: string[]
  userId: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const errorMessage = ref('')

const urls = computed(() => props.modelValue ?? [])
const remaining = computed(() => Math.max(0, ATTENDANCE_EVIDENCE_MAX - urls.value.length))
const canAdd = computed(() => !props.disabled && canAddEvidence(urls.value.length))

function openPicker() {
  if (!canAdd.value || uploading.value) return
  inputRef.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0) return

  errorMessage.value = ''
  const valid = files.filter(isAllowedEvidenceFile)
  if (valid.length === 0) {
    errorMessage.value = '이미지 파일만 등록할 수 있습니다.'
    return
  }

  if (!props.userId) {
    errorMessage.value = '업로드할 수 없습니다.'
    return
  }

  uploading.value = true
  try {
    const next = await uploadAttendanceEvidenceFiles(valid, props.userId, urls.value)
    emit('update:modelValue', next)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '업로드에 실패했습니다.'
  } finally {
    uploading.value = false
  }
}

function removeAt(index: number) {
  if (props.disabled || uploading.value) return
  const next = urls.value.filter((_, i) => i !== index)
  emit('update:modelValue', next)
}
</script>

<template>
  <div>
    <div class="mb-1.5 flex items-center justify-between">
      <label class="block text-sm font-bold text-slate-700">증빙 사진</label>
      <span class="text-xs font-bold text-slate-400">{{ urls.length }}/{{ ATTENDANCE_EVIDENCE_MAX }}</span>
    </div>

    <div class="flex flex-wrap gap-2">
      <div
        v-for="(url, index) in urls"
        :key="`${url}-${index}`"
        class="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      >
        <img :src="url" alt="" class="h-full w-full object-cover" />
        <button
          v-if="!disabled"
          type="button"
          class="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] font-bold text-white"
          @click="removeAt(index)"
        >
          ×
        </button>
      </div>

      <button
        v-if="canAdd"
        type="button"
        class="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        :disabled="uploading"
        @click="openPicker"
      >
        {{ uploading ? '...' : '+' }}
      </button>
    </div>

    <p v-if="errorMessage" class="mt-1.5 text-xs font-bold text-red-500">{{ errorMessage }}</p>
    <p v-else-if="remaining === 0" class="mt-1.5 text-xs text-slate-400">최대 {{ ATTENDANCE_EVIDENCE_MAX }}장</p>

    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { REWARD_PHOTO_LIMIT, takeRewardPhotos } from './rewardPhotos'

const photos = defineModel({ type: Array, required: true })

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})

const message = ref('')
const cameraRef = ref(null)
const albumRef = ref(null)
const canAdd = computed(() => photos.value.length < REWARD_PHOTO_LIMIT && !props.disabled)

function addFiles(fileList) {
  const result = takeRewardPhotos(photos.value.length, [...fileList])
  if (result.invalid) {
    message.value = '이미지 파일만 등록할 수 있습니다.'
    return
  }
  message.value = result.overflow ? '최대 3장' : ''
  photos.value = [
    ...photos.value,
    ...result.accepted.map((file) => ({ file, url: URL.createObjectURL(file) })),
  ]
}

function openCamera() {
  if (!canAdd.value) return
  cameraRef.value?.click()
}

function openAlbum() {
  if (!canAdd.value) return
  albumRef.value?.click()
}

function onPick(event) {
  const files = [...(event.target.files ?? [])]
  event.target.value = ''
  addFiles(files)
}

function removePhoto(index) {
  const next = [...photos.value]
  const [removed] = next.splice(index, 1)
  if (removed) URL.revokeObjectURL(removed.url)
  photos.value = next
  message.value = ''
}

onBeforeUnmount(() => {
  for (const photo of photos.value) URL.revokeObjectURL(photo.url)
})
</script>

<template>
  <input
    ref="cameraRef"
    type="file"
    accept="image/*"
    capture="environment"
    class="hidden"
    @change="onPick"
  />
  <input ref="albumRef" type="file" accept="image/*" multiple class="hidden" @change="onPick" />

  <div class="mt-3 grid grid-cols-2 gap-2">
    <button
      type="button"
      class="rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white disabled:opacity-40"
      :disabled="!canAdd"
      @click="openCamera"
    >
      카메라
    </button>
    <button
      type="button"
      class="rounded-xl border border-slate-200 py-3 text-sm font-extrabold text-slate-700 disabled:opacity-40"
      :disabled="!canAdd"
      @click="openAlbum"
    >
      사진첩
    </button>
  </div>
  <p class="mt-2 text-right text-xs font-bold text-slate-400">{{ photos.length }}/{{ REWARD_PHOTO_LIMIT }}</p>
  <p v-if="message" class="mt-1 text-right text-xs font-bold text-red-500">{{ message }}</p>

  <div v-if="photos.length" class="mt-3 grid grid-cols-3 gap-2">
    <div v-for="(photo, index) in photos" :key="photo.url" class="relative">
      <img :src="photo.url" alt="" class="h-24 w-full rounded-xl object-cover" />
      <button
        type="button"
        class="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white"
        :disabled="disabled"
        @click="removePhoto(index)"
      >
        삭제
      </button>
    </div>
  </div>
</template>

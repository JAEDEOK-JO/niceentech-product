<script setup>
import { computed } from 'vue'
import RewardPhotoThumb from './RewardPhotoThumb.vue'

const props = defineProps({
  note: {
    type: String,
    default: '',
  },
  normalUrls: {
    type: Array,
    default: () => [],
  },
  problemUrls: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['open'])
const showNormal = computed(() => props.normalUrls.length > 0)
const showProblem = computed(() => props.problemUrls.length > 0)
</script>

<template>
  <div v-if="showNormal || showProblem" class="grid grid-cols-2 gap-2">
    <div v-if="showNormal" class="min-w-0">
      <p class="mb-1.5 text-xs font-extrabold text-slate-500">정상</p>
      <RewardPhotoThumb :url="normalUrls[0] || ''" :count="normalUrls.length" @open="emit('open', normalUrls)" />
    </div>
    <div v-if="showProblem" class="min-w-0">
      <p class="mb-1.5 text-xs font-extrabold text-slate-900">문제</p>
      <RewardPhotoThumb :url="problemUrls[0] || ''" :count="problemUrls.length" @open="emit('open', problemUrls)" />
    </div>
  </div>
  <p v-if="note" class="mt-2 break-words text-sm font-bold leading-5 text-slate-900">{{ note }}</p>
</template>

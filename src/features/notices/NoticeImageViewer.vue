<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useWorkerBackClose } from '@/features/worker/pwa/useWorkerBackClose'
import NoticeImageViewerDesktop from './NoticeImageViewerDesktop.vue'
import NoticeImageViewerMobile from './NoticeImageViewerMobile.vue'
import { useNoticeImageMobile } from './useNoticeImageMobile'

defineProps({
  urls: {
    type: Array,
    default: () => [],
  },
  start: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['close'])

useWorkerBackClose(() => emit('close'))

const mobile = useNoticeImageMobile()
let previousOverflow = ''

function close() {
  emit('close')
}

onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.body.style.overflow = previousOverflow
})
</script>

<template>
  <NoticeImageViewerMobile v-if="mobile" :urls="urls" :start="start" @close="close" />
  <NoticeImageViewerDesktop v-else :urls="urls" :start="start" @close="close" />
</template>

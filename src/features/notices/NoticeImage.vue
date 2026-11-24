<script setup>
import { ref } from 'vue'
import NoticeImageViewer from './NoticeImageViewer.vue'

const props = defineProps({
  urls: {
    type: Array,
    default: () => [],
  },
  large: {
    type: Boolean,
    default: false,
  },
})

const viewerIndex = ref(-1)

function open(index) {
  viewerIndex.value = index
}
</script>

<template>
  <div v-if="urls.length" :class="large ? 'grid gap-3' : 'flex gap-2'">
    <template v-if="large">
      <button
        v-for="(url, index) in urls"
        :key="`${index}-${url}`"
        type="button"
        class="block w-full cursor-zoom-in overflow-hidden rounded-xl border-0 bg-transparent p-0"
        @click.stop="open(index)"
      >
        <img :src="url" alt="" draggable="false" class="w-full bg-slate-50 object-contain" />
      </button>
    </template>
    <template v-else>
      <button
        v-for="(url, index) in urls"
        :key="`${index}-${url}`"
        type="button"
        class="h-16 w-16 cursor-zoom-in overflow-hidden rounded-lg border-0 bg-slate-100 p-0"
        @click.stop="open(index)"
      >
        <img :src="url" alt="" draggable="false" class="h-full w-full object-cover" />
      </button>
    </template>
  </div>
  <NoticeImageViewer
    v-if="viewerIndex >= 0"
    :urls="urls"
    :start="viewerIndex"
    @close="viewerIndex = -1"
  />
</template>

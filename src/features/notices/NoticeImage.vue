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

function open(index, event) {
  if (!props.large) return
  event.stopPropagation()
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
        @click="open(index, $event)"
      >
        <img :src="url" alt="" draggable="false" class="w-full bg-slate-50 object-contain" />
      </button>
    </template>
    <template v-else>
      <img
        v-for="(url, index) in urls"
        :key="`${index}-${url}`"
        :src="url"
        alt=""
        draggable="false"
        class="h-16 w-16 rounded-lg bg-slate-100 object-cover"
      />
    </template>
  </div>
  <NoticeImageViewer
    v-if="large && viewerIndex >= 0"
    :urls="urls"
    :start="viewerIndex"
    @close="viewerIndex = -1"
  />
</template>

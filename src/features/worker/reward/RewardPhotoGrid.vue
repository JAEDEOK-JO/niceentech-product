<script setup>
import { computed } from 'vue'
import { buildRewardPhotoTiles } from './rewardPhotoTiles'

const props = defineProps({
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

const photos = computed(() => buildRewardPhotoTiles(props.normalUrls, props.problemUrls))

const open = (start) =>
  emit('open', {
    urls: photos.value.all.map((photo) => photo.url),
    labels: photos.value.all.map((photo) => photo.label),
    start,
  })
</script>

<template>
  <div v-if="photos.tiles.length" class="flex gap-1.5">
    <button
      v-for="(tile, position) in photos.tiles"
      :key="tile.index"
      type="button"
      class="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100"
      @click="open(tile.index)"
    >
      <img :src="tile.url" alt="" class="h-full w-full object-cover" />
      <span
        class="absolute left-1 top-1 rounded px-1 py-px text-[9px] font-extrabold leading-none"
        :class="tile.label === '문제' ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-700'"
      >
        {{ tile.label }}
      </span>
      <span
        v-if="photos.hidden > 0 && position === photos.tiles.length - 1"
        class="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-extrabold text-white"
      >
        +{{ photos.hidden }}
      </span>
    </button>
  </div>
</template>

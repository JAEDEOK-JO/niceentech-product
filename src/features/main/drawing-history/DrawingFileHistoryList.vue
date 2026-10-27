<script setup>
import { computed, ref, watch } from 'vue'
import { fetchDrawingFileHistory } from '@/features/main/drawing-history/fetchDrawingFileHistory'

const PREVIEW_COUNT = 3

const props = defineProps({
  productListId: { type: [Number, String], default: 0 },
})

const items = ref([])
const expanded = ref(false)

const visibleItems = computed(() => (expanded.value ? items.value : items.value.slice(0, PREVIEW_COUNT)))
const hasMore = computed(() => !expanded.value && items.value.length > PREVIEW_COUNT)

async function reload() {
  const id = Number(props.productListId)
  if (!id) {
    items.value = []
    return
  }
  items.value = await fetchDrawingFileHistory(id)
}

watch(
  () => props.productListId,
  () => {
    expanded.value = false
    reload()
  },
  { immediate: true },
)

defineExpose({ reload })
</script>

<template>
  <div v-if="items.length" class="mb-4">
    <ul class="space-y-1">
      <li v-for="item in visibleItems" :key="item.id" class="truncate text-xs">
        <span class="font-bold" :class="item.action === 'deleted' ? 'text-rose-600' : 'text-slate-800'">
          {{ item.dateLabel }} {{ item.actionLabel }}
        </span>
        <span class="text-slate-500"> {{ item.fileName }}</span>
      </li>
    </ul>
    <button v-if="hasMore" type="button" class="mt-1 text-xs font-bold text-slate-500 hover:text-slate-800" @click="expanded = true">
      더보기
    </button>
  </div>
</template>

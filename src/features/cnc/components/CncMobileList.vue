<script setup lang="ts">
import type { CncItem } from '../types/cnc'
import CncMobileListItem from './CncMobileListItem.vue'

defineProps<{
  items: CncItem[]
  loading: boolean
  updatingId: number | null
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-completed', payload: { id: number; isCompleted: boolean }): void
  (e: 'edit-area', item: CncItem): void
}>()
</script>

<template>
  <div v-if="loading" class="border-t border-slate-200 py-12 text-center text-sm font-bold text-slate-500">
    불러오는 중...
  </div>
  <div v-else-if="items.length === 0" class="border-t border-slate-200 py-12 text-center text-sm font-bold text-slate-500">
    등록된 항목이 없습니다.
  </div>
  <ul v-else class="border-t border-slate-200">
    <CncMobileListItem
      v-for="item in items"
      :key="item.id"
      :item="item"
      :busy="updatingId === item.id"
      :can-manage="canManage"
      @toggle-completed="emit('toggle-completed', $event)"
      @edit-area="emit('edit-area', $event)"
    />
  </ul>
</template>

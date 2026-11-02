<script setup lang="ts">
import { computed } from 'vue'
import { useQualityCountPress } from '../composables/useQualityCountPress'
import type { QualityListRow } from '../types/quality'
import type { QualityCountColumn } from '../utils/countColumns'

const props = defineProps<{
  item: QualityListRow
  column: QualityCountColumn
  variant: 'table' | 'card'
}>()

const emit = defineEmits<{
  openCancel: []
  toggleReturn: [value: boolean]
}>()

const quantity = computed(() => Number(props.item[props.column.valueKey] ?? 0))
const cancelCount = computed(() => Number(props.item[props.column.cancelKey] ?? 0))
const returned = computed(() => Boolean(props.item[props.column.returnKey]))

const press = useQualityCountPress(() => {
  if (quantity.value <= 0 && !returned.value) return
  emit('toggleReturn', !returned.value)
})

function openCancel() {
  if (quantity.value <= 0 && cancelCount.value <= 0 && !returned.value) return
  emit('openCancel')
}
</script>

<template>
  <button
    type="button"
    :class="[
      variant === 'table' ? 'count-btn' : 'qt-card-count',
      column.metric ? (variant === 'table' ? 'count-btn--metric' : 'qt-card-count--metric') : 'qt-card-count--inch',
      { 'count-cell--return': returned },
    ]"
    @pointerdown.stop="press.onPointerDown"
    @pointerup="press.onPointerEnd"
    @pointercancel="press.onPointerEnd"
    @contextmenu="press.onContextMenu"
    @click.stop="press.onClick($event, openCancel)"
  >
    <span v-if="variant === 'card'" class="count-label">{{ column.label }}</span>
    <strong class="count-qty">{{ variant === 'card' ? (quantity || '-') : (quantity || '') }}</strong>
    <em v-if="cancelCount > 0" class="count-cancel">{{ cancelCount }}</em>
  </button>
</template>

<style scoped>
.count-btn,
.qt-card-count {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.count-btn {
  display: flex;
  width: 100%;
  height: 64px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 0;
  border: none;
  background: transparent;
  color: #111827;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
}

.count-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.qt-card-count {
  width: 100%;
  min-height: 52px;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  background: #fff;
  padding: 7px 4px;
  color: #0f172a;
  text-align: center;
}

.qt-card-count--metric {
  background: #fff7ed;
  border-color: #fed7aa;
}

.count-label,
.count-qty,
.count-cancel {
  display: block;
  font-style: normal;
}

.count-label {
  color: #64748b;
  font-size: 9px;
  font-weight: 900;
}

.count-qty {
  font-size: inherit;
  font-weight: 900;
}

.qt-card-count .count-qty {
  margin-top: 3px;
  font-size: 13px;
}

.count-cancel {
  color: #dc2626;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.1;
}

.count-cell--return,
.count-cell--return:hover {
  background: #ef4444;
  color: #fff;
}

.qt-card-count.count-cell--return {
  border-color: #dc2626;
}

.count-cell--return .count-label,
.count-cell--return .count-cancel {
  color: #fff;
}
</style>

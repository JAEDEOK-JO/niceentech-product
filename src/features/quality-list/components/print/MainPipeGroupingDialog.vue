<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { MainPipeGroupableGroup } from '../../types/print'

const props = defineProps<{
  open: boolean
  groups: MainPipeGroupableGroup[]
}>()

const emit = defineEmits<{
  close: []
  print: [groupedIndices: Record<string, number[]>]
}>()

const selected = reactive<Record<string, number[]>>({})

function resetSelection() {
  for (const key of Object.keys(selected)) {
    delete selected[key]
  }
  for (const group of props.groups) {
    selected[group.key] = group.items.map((item) => item.originalIndex)
  }
}

watch(
  () => [props.open, props.groups] as const,
  ([open]) => {
    if (open) resetSelection()
  },
  { immediate: true },
)

function isChecked(key: string, index: number) {
  return (selected[key] ?? []).includes(index)
}

function toggle(key: string, index: number) {
  const current = selected[key] ?? []
  selected[key] = current.includes(index)
    ? current.filter((value) => value !== index)
    : [...current, index]
}

function selectAll() {
  for (const group of props.groups) {
    selected[group.key] = group.items.map((item) => item.originalIndex)
  }
}

function clearAll() {
  for (const group of props.groups) {
    selected[group.key] = []
  }
}

function itemLabel(index: number, area: string) {
  const trimmed = area.trim()
  return trimmed ? `${index}번 - ${trimmed}` : `${index}번`
}

function submit() {
  emit('print', { ...selected })
}
</script>

<template>
  <div v-if="open" class="dialog-overlay" @click.self="emit('close')">
    <div class="dialog-box">
      <div class="dialog-header">
        <h2>메인관 그룹핑</h2>
        <button type="button" class="dialog-close" @click="emit('close')">닫기</button>
      </div>

      <div class="dialog-toolbar">
        <button type="button" class="ghost-button" @click="selectAll">전체선택</button>
        <button type="button" class="ghost-button" @click="clearAll">전체해제</button>
      </div>

      <div class="dialog-groups">
        <section v-for="group in groups" :key="group.key" class="group-card">
          <h3>{{ group.company }} {{ group.place }}</h3>
          <label
            v-for="item in group.items"
            :key="item.originalIndex"
            class="checkbox-inline group-item"
          >
            <input
              type="checkbox"
              :checked="isChecked(group.key, item.originalIndex)"
              @change="toggle(group.key, item.originalIndex)"
            />
            <span>{{ itemLabel(item.originalIndex, item.area) }}</span>
          </label>
        </section>
      </div>

      <div class="dialog-actions">
        <button type="button" class="da-btn da-btn--blue" @click="submit">출력</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  padding: 16px;
}

.dialog-box {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  padding: 24px;
  width: 100%;
  max-width: 520px;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.dialog-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.dialog-close {
  font-size: 12px;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.dialog-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.dialog-toolbar .ghost-button {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
}

.dialog-groups {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.group-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #f8fafc;
}

.group-card h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.group-item {
  display: flex;
  width: 100%;
  padding: 6px 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.group-item input {
  width: 16px;
  height: 16px;
}

.dialog-actions {
  display: flex;
  margin-top: 16px;
}

.da-btn {
  flex: 1;
  padding: 13px 8px;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
  background: #dbeafe;
  font-size: 13px;
  font-weight: 700;
  color: #1e40af;
  cursor: pointer;
}

.da-btn:hover {
  background: #bfdbfe;
}
</style>

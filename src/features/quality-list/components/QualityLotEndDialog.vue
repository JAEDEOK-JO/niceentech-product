<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  value: number
}>()

const emit = defineEmits<{
  close: []
  save: [value: number]
}>()

const draft = ref('')

watch(
  () => props.value,
  (value) => {
    draft.value = value > 0 ? String(value) : ''
  },
  { immediate: true },
)

function blockInvalidKey(event: KeyboardEvent) {
  if (['e', 'E', '+', '-', '.'].includes(event.key)) event.preventDefault()
}

function save() {
  const parsed = Number.parseInt(draft.value, 10)
  emit('save', Number.isFinite(parsed) && parsed > 0 ? parsed : 0)
}
</script>

<template>
  <div class="dialog-overlay" @click.self="emit('close')">
    <form class="dialog-box" @submit.prevent="save">
      <div class="dialog-header">
        <p class="dialog-title">끝번호</p>
        <button type="button" class="dialog-close" @click="emit('close')">닫기</button>
      </div>
      <input
        v-model="draft"
        class="end-input"
        type="number"
        inputmode="numeric"
        min="0"
        autofocus
        @keydown="blockInvalidKey"
      />
      <div class="dialog-actions">
        <button type="submit" class="save-btn">저장</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  padding: 16px;
}

.dialog-box {
  box-sizing: border-box;
  width: 100%;
  max-width: 280px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  padding: 24px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.dialog-title {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.dialog-close {
  padding: 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

.end-input {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  outline: none;
  -moz-appearance: textfield;
}

.end-input::-webkit-outer-spin-button,
.end-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.end-input:focus {
  border-color: #0284c7;
}

.dialog-actions {
  margin-top: 16px;
}

.save-btn {
  width: 100%;
  padding: 10px 0;
  border: 1px solid #0284c7;
  border-radius: 10px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
</style>

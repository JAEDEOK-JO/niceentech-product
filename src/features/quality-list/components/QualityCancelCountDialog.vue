<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  label: string
  value: number
  max: number
}>()

const emit = defineEmits<{
  close: []
  save: [value: number]
}>()

const draft = ref('')

watch(
  () => [props.label, props.value] as const,
  () => {
    draft.value = props.value > 0 ? String(props.value) : ''
  },
  { immediate: true },
)

function blockInvalidKey(event: KeyboardEvent) {
  if (['e', 'E', '+', '-', '.'].includes(event.key)) event.preventDefault()
}

function save() {
  const parsed = Number.parseInt(draft.value, 10)
  const next = Number.isFinite(parsed) ? parsed : 0
  const limit = Math.max(props.max, 0)
  emit('save', Math.min(Math.max(next, 0), limit))
}
</script>

<template>
  <div class="dialog-overlay" @click.self="emit('close')">
    <form class="dialog-box" @submit.prevent="save">
      <div class="dialog-header">
        <p class="dialog-company">{{ label }} 취소수량</p>
        <button type="button" class="dialog-close" @click="emit('close')">닫기</button>
      </div>
      <input
        v-model="draft"
        class="cancel-input"
        type="number"
        inputmode="numeric"
        min="0"
        :max="max"
        autofocus
        @keydown="blockInvalidKey"
      />
      <div class="dialog-actions">
        <button type="submit" class="da-btn">저장</button>
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.dialog-company {
  margin: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.dialog-close {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

.cancel-input {
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

.cancel-input::-webkit-outer-spin-button,
.cancel-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.cancel-input:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.18);
}

.dialog-actions {
  margin-top: 16px;
}

.da-btn {
  width: 100%;
  padding: 13px 8px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.da-btn:hover {
  background: #fecaca;
}
</style>

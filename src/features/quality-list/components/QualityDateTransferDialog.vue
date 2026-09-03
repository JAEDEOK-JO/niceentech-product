<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  formatIsoDate,
  formatQualityDate,
  getNextTuesday,
  moveByWeeks,
  parseQualityDate,
} from '../utils/date'
import type { QualityListRow } from '../types/quality'

const props = defineProps<{
  item: QualityListRow | null
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  move: [item: QualityListRow, testDate: string]
  copy: [item: QualityListRow, testDate: string]
}>()

const selectedTuesday = ref(getNextTuesday(new Date()))
const calendarInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.item,
  (item) => {
    if (!item) return
    selectedTuesday.value = getNextTuesday(parseQualityDate(item.testDate))
  },
  { immediate: true },
)

const dateLabel = computed(() => formatQualityDate(selectedTuesday.value))
const calendarValue = computed(() => formatIsoDate(selectedTuesday.value))
const sameDate = computed(() => Boolean(props.item && props.item.testDate === dateLabel.value))

function previousWeek() {
  selectedTuesday.value = moveByWeeks(selectedTuesday.value, -1)
}

function nextWeek() {
  selectedTuesday.value = moveByWeeks(selectedTuesday.value, 1)
}

function thisWeek() {
  selectedTuesday.value = getNextTuesday(new Date())
}

function openCalendar() {
  calendarInput.value?.showPicker?.()
  calendarInput.value?.click()
}

function handleCalendarChange(value: string) {
  selectedTuesday.value = getNextTuesday(parseQualityDate(value))
}

function submitMove() {
  if (!props.item || props.busy || sameDate.value) return
  emit('move', props.item, dateLabel.value)
}

function submitCopy() {
  if (!props.item || props.busy || sameDate.value) return
  emit('copy', props.item, dateLabel.value)
}
</script>

<template>
  <div v-if="item" class="dialog-overlay" @click.self="emit('close')">
    <div class="dialog-box">
      <div class="dialog-header">
        <div>
          <p class="dialog-company">{{ item.company }} {{ item.place }}</p>
          <p v-if="item.area" class="dialog-area">{{ item.area }}</p>
        </div>
        <button type="button" class="dialog-close" :disabled="busy" @click="emit('close')">닫기</button>
      </div>

      <p class="dialog-date">{{ dateLabel }}</p>

      <div class="dialog-weeks">
        <button type="button" class="ghost-button" :disabled="busy" @click="previousWeek">지난주</button>
        <button type="button" class="primary-button" :disabled="busy" @click="thisWeek">이번주</button>
        <button type="button" class="ghost-button" :disabled="busy" @click="nextWeek">다음주</button>
        <button type="button" class="ghost-button icon-button" :disabled="busy" aria-label="달력" @click="openCalendar">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
          </svg>
        </button>
        <input
          ref="calendarInput"
          :value="calendarValue"
          type="date"
          class="calendar-input sr-only"
          @input="handleCalendarChange(($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="dialog-actions">
        <button type="button" class="da-btn da-btn--blue" :disabled="busy || sameDate" @click="submitMove">이동</button>
        <button type="button" class="da-btn da-btn--green" :disabled="busy || sameDate" @click="submitCopy">복사</button>
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
  position: relative;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  padding: 24px;
  width: 100%;
  max-width: 360px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.dialog-company {
  font-weight: 700;
  font-size: 14px;
  color: #0f172a;
  margin: 0;
}

.dialog-area {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0 0;
}

.dialog-close {
  font-size: 12px;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.dialog-close:disabled {
  cursor: default;
}

.dialog-date {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.dialog-weeks {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
}

.dialog-weeks .ghost-button,
.dialog-weeks .primary-button {
  flex: 1;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 700;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  flex: 0 0 42px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dialog-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
}

.da-btn {
  flex: 1;
  padding: 13px 8px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  transition: background 0.12s;
  white-space: nowrap;
}

.da-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.da-btn--blue { background: #dbeafe; border-color: #bfdbfe; color: #1e40af; }
.da-btn--blue:hover:not(:disabled) { background: #bfdbfe; }
.da-btn--green { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
.da-btn--green:hover:not(:disabled) { background: #bbf7d0; }
</style>

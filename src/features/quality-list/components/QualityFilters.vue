<script setup lang="ts">
import { ref } from 'vue'
import { vVirtualKeyboard } from '@/features/virtual-keyboard/directives/vVirtualKeyboard'

defineProps<{
  searchQuery: string
  showAllRecords: boolean
  currentDateLabel: string
  calendarValue: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:showAllRecords': [value: boolean]
  calendarChange: [value: string]
  search: []
  clear: []
  previousWeek: []
  nextWeek: []
  thisWeek: []
  refresh: []
  create: []
  noticeUpload: []
  export: []
  print: []
  calculation: []
}>()

const calendarInput = ref<HTMLInputElement | null>(null)

function openCalendar() {
  calendarInput.value?.showPicker?.()
  calendarInput.value?.click()
}
</script>

<template>
  <section class="quality-filters">
    <div class="filter-left">
      <h1 class="quality-title">
        <template v-if="showAllRecords">
          <span class="quality-title-accent">검수리스트</span>
          <span class="quality-title-date"> 전체 검색결과</span>
        </template>
        <template v-else>
          <span class="quality-title-date">{{ currentDateLabel }}</span>
          <span class="quality-title-accent">검수리스트</span>
        </template>
      </h1>
    </div>

    <div class="filter-right">
      <button type="button" class="ghost-button" @click="emit('previousWeek')">지난주</button>
      <button type="button" class="primary-button" @click="emit('thisWeek')">이번주</button>
      <button type="button" class="ghost-button" @click="emit('nextWeek')">다음주</button>
      <button type="button" class="ghost-button icon-button" @click="openCalendar" aria-label="달력">
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
        @input="emit('calendarChange', ($event.target as HTMLInputElement).value)"
      />
      <div class="quality-print-actions">
        <button type="button" class="ghost-button" @click="emit('print')">리스트출력</button>
        <button type="button" class="ghost-button" @click="emit('export')">메인관출력</button>
        <button type="button" class="ghost-button" @click="emit('calculation')">가지관 출력</button>
      </div>
      <button type="button" class="primary-button quality-create-button" @click="emit('create')">등록</button>
      <button type="button" class="ghost-button quality-notice-button" @click="emit('noticeUpload')">통보서</button>
      <div class="quality-search-row">
        <input
          v-virtual-keyboard
          :value="searchQuery"
          type="text"
          class="search-input"
          placeholder="검색"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('search')"
        />
        <label class="toggle-inline">
          <input
            :checked="showAllRecords"
            type="checkbox"
            @change="
              emit(
                'update:showAllRecords',
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
          <span class="toggle-box" />
          <span>전체</span>
        </label>
      </div>
    </div>
  </section>
</template>

<style scoped>
.quality-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
}

.quality-title-accent {
  color: #c2410c;
}

.quality-title-date {
  margin-right: 10px;
  color: #0f172a;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
}

.toggle-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.toggle-inline input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-box {
  width: 18px;
  height: 18px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  display: inline-block;
  position: relative;
}

.toggle-inline input:checked + .toggle-box {
  background: #2563eb;
  border-color: #2563eb;
}

.toggle-inline input:checked + .toggle-box::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
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

.search-input {
  min-width: 100px;
  width: 100px;
}

.quality-print-actions {
  display: contents;
}

.quality-search-row {
  display: contents;
}

@media (max-width: 767px) {
  .quality-print-actions {
    display: none;
  }

  .quality-create-button {
    display: none;
  }

  .quality-notice-button {
    display: none;
  }

  .quality-search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .quality-search-row .search-input {
    min-width: 0;
    flex: 1;
    width: auto;
  }

  .quality-search-row .toggle-inline {
    min-height: 42px;
    flex-shrink: 0;
    padding: 0;
  }
}
</style>

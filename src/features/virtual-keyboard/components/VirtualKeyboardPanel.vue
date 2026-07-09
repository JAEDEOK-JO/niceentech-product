<script setup>
import { computed } from 'vue'
import {
  EN_ROWS,
  KO_ROWS,
  KO_SHIFT_ROWS,
  NUMBER_ROW,
} from '@/features/virtual-keyboard/constants/keyboardLayouts'
import { useVirtualKeyboard } from '@/features/virtual-keyboard/composables/useVirtualKeyboard'

const { visible, layout, shift, canUse, pressKey, close } = useVirtualKeyboard()
const showPanel = computed(() => visible.value && canUse.value)

const letterRows = computed(() => {
  if (layout.value === 'ko') {
    return shift.value ? KO_SHIFT_ROWS : KO_ROWS
  }
  return EN_ROWS
})

const langLabel = computed(() => (layout.value === 'ko' ? '영문' : '한글'))

const onPanelMouseDown = (event) => {
  event.preventDefault()
}

const onKey = (key) => {
  pressKey(key)
}
</script>

<template>
  <div
    v-if="showPanel"
    class="vk-panel"
    @mousedown="onPanelMouseDown"
  >
    <div class="vk-toolbar">
      <span class="vk-title">가상키보드</span>
      <button type="button" class="vk-tool-btn" @click="onKey('close')">닫기</button>
    </div>

    <div class="vk-row">
      <button
        v-for="key in NUMBER_ROW"
        :key="`num-${key}`"
        type="button"
        class="vk-key"
        @click="onKey(key)"
      >
        {{ key }}
      </button>
    </div>

    <div v-for="(row, rowIndex) in letterRows" :key="`row-${rowIndex}`" class="vk-row">
      <button
        v-if="rowIndex === 2"
        type="button"
        class="vk-key vk-key--wide"
        :class="{ 'vk-key--active': shift }"
        @click="onKey('shift')"
      >
        Shift
      </button>
      <button
        v-for="key in row"
        :key="`${rowIndex}-${key}`"
        type="button"
        class="vk-key"
        @click="onKey(layout === 'en' && shift ? key.toUpperCase() : key)"
      >
        {{ layout === 'en' && shift ? key.toUpperCase() : key }}
      </button>
      <button
        v-if="rowIndex === 2"
        type="button"
        class="vk-key vk-key--wide"
        @click="onKey('backspace')"
      >
        ⌫
      </button>
    </div>

    <div class="vk-row">
      <button type="button" class="vk-key vk-key--wide" @click="onKey('lang')">{{ langLabel }}</button>
      <button type="button" class="vk-key vk-key--space" @click="onKey('space')">스페이스</button>
      <button type="button" class="vk-key vk-key--wide" @click="onKey('enter')">검색</button>
      <button type="button" class="vk-key" @click="close">닫기</button>
    </div>
  </div>
</template>

<style scoped>
.vk-panel {
  position: fixed;
  left: 50%;
  bottom: 12px;
  z-index: 80;
  width: min(920px, calc(100vw - 24px));
  transform: translateX(-50%);
  border: 1px solid #cbd5e1;
  border-radius: 18px;
  background: #f8fafc;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
  padding: 10px 12px 12px;
  user-select: none;
}

.vk-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.vk-title {
  font-size: 12px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.vk-tool-btn {
  border: 0;
  background: transparent;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.vk-row {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
}

.vk-key {
  min-width: 42px;
  height: 44px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.vk-key:active {
  background: #e2e8f0;
}

.vk-key--wide {
  min-width: 72px;
  font-size: 13px;
}

.vk-key--space {
  flex: 1;
  min-width: 180px;
  font-size: 13px;
}

.vk-key--active {
  background: #0f172a;
  border-color: #0f172a;
  color: #fff;
}

@media (max-width: 768px) {
  .vk-panel {
    display: none;
  }
}
</style>

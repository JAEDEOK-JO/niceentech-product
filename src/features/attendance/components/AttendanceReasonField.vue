<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { isPresetLeaveReason } from '../utils/attendanceReason'

const CUSTOM_KEY = '__custom__'

const props = defineProps<{
  modelValue: string
  reasons: readonly string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const isCustomMode = computed(() => !isPresetLeaveReason(props.modelValue))

const selectedKey = computed(() =>
  isCustomMode.value ? CUSTOM_KEY : props.modelValue,
)

function selectPreset(reason: string) {
  emit('update:modelValue', reason)
}

async function selectCustom() {
  if (!isCustomMode.value) {
    emit('update:modelValue', '')
  }
  await nextTick()
  inputRef.value?.focus()
}

function onCustomInput(value: string) {
  emit('update:modelValue', value)
}

watch(isCustomMode, async (custom) => {
  if (!custom) return
  await nextTick()
  inputRef.value?.focus()
})
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="r in reasons"
        :key="r"
        type="button"
        :disabled="disabled"
        class="rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-50"
        :class="selectedKey === r
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
        @click="selectPreset(r)"
      >
        {{ r }}
      </button>
      <button
        type="button"
        :disabled="disabled"
        class="rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors disabled:opacity-50"
        :class="selectedKey === CUSTOM_KEY
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
        @click="selectCustom"
      >
        직접입력
      </button>
    </div>

    <input
      ref="inputRef"
      type="text"
      :value="isCustomMode ? modelValue : ''"
      :disabled="disabled || !isCustomMode"
      maxlength="100"
      placeholder="사유 입력"
      class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
      @input="onCustomInput(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

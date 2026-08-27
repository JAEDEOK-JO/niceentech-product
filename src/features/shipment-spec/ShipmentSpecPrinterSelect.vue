<script setup>
defineProps({
  printers: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
})

defineEmits(['update:modelValue', 'refresh'])
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between gap-3">
      <label class="text-sm font-extrabold text-slate-800">프린터</label>
      <button
        type="button"
        class="text-xs font-extrabold text-slate-500 hover:text-slate-900"
        @click="$emit('refresh')"
      >새로고침</button>
    </div>
    <select
      class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
      :value="modelValue"
      :disabled="loading || printers.length === 0"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">
        {{ loading ? '불러오는 중' : '시스템 기본 프린터' }}
      </option>
      <option
        v-for="printer in printers"
        :key="printer.name"
        :value="printer.name"
      >
        {{ printer.displayName }}{{ printer.isDefault ? ' (기본)' : '' }}
      </option>
    </select>
    <p v-if="errorMessage" class="mt-1 text-[12px] font-bold text-red-500">{{ errorMessage }}</p>
  </div>
</template>

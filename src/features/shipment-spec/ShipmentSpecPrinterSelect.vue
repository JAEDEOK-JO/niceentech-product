<script setup>
import { useShipmentSpecDialogLocale } from './useShipmentSpecDialogLocale'

defineProps({
  printers: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'refresh'])

const { copy } = useShipmentSpecDialogLocale()
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between gap-3">
      <label class="text-sm font-extrabold text-slate-800">{{ copy.printer }}</label>
      <button
        type="button"
        class="text-xs font-extrabold text-slate-500 hover:text-slate-900"
        @click="$emit('refresh')"
      >{{ copy.refresh }}</button>
    </div>
    <select
      class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
      :value="modelValue"
      :disabled="loading || printers.length === 0"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">
        {{ loading ? copy.loading : copy.defaultPrinter }}
      </option>
      <option
        v-for="printer in printers"
        :key="printer.name"
        :value="printer.name"
      >
        {{ printer.displayName }}{{ printer.isDefault ? copy.defaultSuffix : '' }}
      </option>
    </select>
    <p v-if="error" class="mt-1 text-[12px] font-bold text-red-500">{{ copy.printerLoadError }}</p>
  </div>
</template>

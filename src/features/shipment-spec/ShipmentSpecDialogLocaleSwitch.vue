<script setup>
import { SHIPMENT_SPEC_DIALOG_LOCALES } from './shipmentSpecDialogCopy'
import { useShipmentSpecDialogLocale } from './useShipmentSpecDialogLocale'

const { locale } = useShipmentSpecDialogLocale()
</script>

<template>
  <div
    class="flex items-center gap-3"
    role="radiogroup"
    aria-label="한국어 / ภาษาไทย"
  >
    <label
      v-for="option in SHIPMENT_SPEC_DIALOG_LOCALES"
      :key="option.value"
      class="flex cursor-pointer items-center gap-1.5 text-xs font-bold"
      :class="locale === option.value ? 'text-slate-900' : 'text-slate-500'"
    >
      <input
        v-model="locale"
        type="radio"
        class="peer sr-only"
        name="shipment-spec-dialog-locale"
        :value="option.value"
      >
      <span
        class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 bg-white"
        :class="locale === option.value ? 'border-slate-900' : 'border-slate-300'"
      >
        <span
          class="h-2 w-2 rounded-full"
          :class="locale === option.value ? 'bg-slate-900' : 'bg-transparent'"
        />
      </span>
      {{ option.label }}
    </label>
  </div>
</template>

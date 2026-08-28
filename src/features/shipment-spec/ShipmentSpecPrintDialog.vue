<script setup>
import { watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import ShipmentSpecPrinterSelect from './ShipmentSpecPrinterSelect.vue'
import ShipmentSpecRemarkFields from './ShipmentSpecRemarkFields.vue'
import { useShipmentSpecPrinters } from './useShipmentSpecPrinters'

const props = defineProps({
  open: { type: Boolean, default: false },
  orientation: { type: String, default: 'portrait' },
  remarkFields: { type: Array, default: () => [] },
  printing: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'print', 'add', 'remove', 'update:orientation'])

const {
  printers,
  selectedPrinterName,
  printerLoading,
  printerError,
  loadPrinters,
  resetPrinters,
} = useShipmentSpecPrinters()

const canSelectPrinter = typeof window !== 'undefined' && Boolean(window.electronAPI?.getPrinters)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    resetPrinters()
    void loadPrinters()
  },
)

const handlePrint = () => {
  emit('print', { deviceName: selectedPrinterName.value })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="shipment-spec-print-dialog fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
    >
      <div class="flex max-h-[82vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div class="space-y-3 border-b border-slate-200 px-5 py-4">
          <div class="flex items-center justify-between gap-3">
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="rounded-xl border px-4 py-2 text-sm font-extrabold transition"
                :class="orientation === 'portrait' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                @click="emit('update:orientation', 'portrait')"
              >세로</button>
              <button
                type="button"
                class="rounded-xl border px-4 py-2 text-sm font-extrabold transition"
                :class="orientation === 'landscape' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                @click="emit('update:orientation', 'landscape')"
              >가로</button>
            </div>
            <button type="button" class="text-sm font-bold text-slate-400 hover:text-slate-700" @click="emit('close')">닫기</button>
          </div>
          <ShipmentSpecPrinterSelect
            v-if="canSelectPrinter"
            v-model="selectedPrinterName"
            :printers="printers"
            :loading="printerLoading"
            :error-message="printerError"
            @refresh="loadPrinters"
          />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ShipmentSpecRemarkFields
            :remark-fields="remarkFields"
            @add="emit('add')"
            @remove="emit('remove', $event)"
          />
        </div>

        <div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button class="h-9 px-4 text-sm" variant="outline" :disabled="printing" @click="handlePrint">인쇄</Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

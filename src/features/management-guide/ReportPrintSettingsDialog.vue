<script setup>
import PrintSettingsDialog from '@/features/printing/PrintSettingsDialog.vue'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'print'])
</script>

<template>
  <PrintSettingsDialog
    :open="open"
    @close="emit('close')"
    @print="(options) => emit('print', options)"
  />
</template>

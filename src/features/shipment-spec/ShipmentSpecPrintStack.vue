<script setup>
import ShipmentSpecForm from './ShipmentSpecForm.vue'

defineProps({
  sheets: { type: Array, default: () => [] },
  landscape: { type: Boolean, default: false },
})
</script>

<template>
  <div v-if="sheets.length" class="shipment-spec-print-root">
    <div
      v-for="(sheet, index) in sheets"
      :key="index"
      class="shipment-spec-print-item"
    >
      <ShipmentSpecForm :form="sheet" :landscape="landscape" />
    </div>
  </div>
</template>

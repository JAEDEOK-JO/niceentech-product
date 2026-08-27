<script setup>
import DesignExecutiveReportExampleView from '@/features/management-guide/DesignExecutiveReportExampleView.vue'
import OperationsExecutiveReportExampleView from '@/features/management-guide/OperationsExecutiveReportExampleView.vue'
import ProductionExecutiveReportExampleView from '@/features/management-guide/ProductionExecutiveReportExampleView.vue'
import SalesExecutiveReportExampleView from '@/features/management-guide/SalesExecutiveReportExampleView.vue'
import { BATCH_PRINT_DEPARTMENTS } from './batchPrintReports'

const views = {
  design: DesignExecutiveReportExampleView,
  production: ProductionExecutiveReportExampleView,
  operations: OperationsExecutiveReportExampleView,
  sales: SalesExecutiveReportExampleView,
}
</script>

<template>
  <div
    v-for="department in BATCH_PRINT_DEPARTMENTS"
    :key="department.key"
    class="batch-print-item"
  >
    <component :is="views[department.key]" :show-back-button="false" />
  </div>
</template>

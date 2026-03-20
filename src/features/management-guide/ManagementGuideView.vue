<script setup>
import { computed, ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { departments } from '@/features/management-guide/managementGuideData'
import SalesExecutiveReportExampleView from '@/features/management-guide/SalesExecutiveReportExampleView.vue'
import DesignExecutiveReportExampleView from '@/features/management-guide/DesignExecutiveReportExampleView.vue'
import OperationsExecutiveReportExampleView from '@/features/management-guide/OperationsExecutiveReportExampleView.vue'
import ProductionExecutiveReportExampleView from '@/features/management-guide/ProductionExecutiveReportExampleView.vue'

const emit = defineEmits(['go-home'])

const activeTab = ref(departments[0].key)

const currentDepartment = computed(
  () => departments.find((department) => department.key === activeTab.value) ?? departments[0],
)

const toneClasses = {
  indigo: {
    tab: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    panel: 'border-indigo-200 bg-indigo-50/50',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  emerald: {
    tab: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    panel: 'border-emerald-200 bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  amber: {
    tab: 'border-amber-200 bg-amber-50 text-amber-700',
    panel: 'border-amber-200 bg-amber-50/50',
    badge: 'bg-amber-100 text-amber-700',
  },
  rose: {
    tab: 'border-rose-200 bg-rose-50 text-rose-700',
    panel: 'border-rose-200 bg-rose-50/50',
    badge: 'bg-rose-100 text-rose-700',
  },
}

const getTone = (tone) =>
  toneClasses[tone] ?? {
    tab: 'border-slate-200 bg-slate-50 text-slate-700',
    panel: 'border-slate-200 bg-slate-50',
    badge: 'bg-slate-100 text-slate-700',
  }

const currentView = computed(() => {
  if (activeTab.value === 'sales') return SalesExecutiveReportExampleView
  if (activeTab.value === 'design') return DesignExecutiveReportExampleView
  if (activeTab.value === 'operations') return OperationsExecutiveReportExampleView
  return ProductionExecutiveReportExampleView
})
</script>

<template>
  <section class="management-report-root min-h-screen bg-slate-100">
    <main class="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section class="management-report-shell rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div class="management-report-tabs flex flex-wrap gap-2">
          <button
            v-for="department in departments"
            :key="department.key"
            type="button"
            class="rounded-2xl border px-4 py-2 text-sm font-bold transition"
            :class="
              activeTab === department.key
                ? getTone(department.tone).tab
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="activeTab = department.key"
          >
            {{ department.name }}
          </button>
        </div>

        <div class="management-report-panel mt-5 overflow-hidden rounded-3xl border" :class="getTone(currentDepartment.tone).panel">
          <component :is="currentView" :show-back-button="false" />
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
@media print {
  .management-report-root {
    background: #fff !important;
  }

  .management-report-shell {
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .management-report-panel {
    margin-top: 0 !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    overflow: visible !important;
  }

  .management-report-tabs {
    display: none !important;
  }
}
</style>

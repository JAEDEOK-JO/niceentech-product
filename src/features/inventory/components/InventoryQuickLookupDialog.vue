<script setup>
import { ref } from 'vue'
import InventoryCompanySearchDialog from './InventoryCompanySearchDialog.vue'
import InventoryStockSummary from './InventoryStockSummary.vue'
import { fetchInventoryStockSummary } from '@/features/inventory/services/inventory.service'

const props = defineProps({
  companies: { type: Array, default: () => [] },
  materialItems: { type: Array, default: () => [] },
})

const emit = defineEmits(['close'])

const selectedCompany = ref(null)
const stockRows = ref([])
const loading = ref(false)
const errorMessage = ref('')

const formatCompany = (company) => [company?.company, company?.place].filter(Boolean).join(' ')

const selectCompany = async (company) => {
  selectedCompany.value = company
  loading.value = true
  errorMessage.value = ''
  try {
    stockRows.value = await fetchInventoryStockSummary(props.materialItems, company.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '현장 재고를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <InventoryCompanySearchDialog
    :companies="companies"
    title="간편조회"
    description="현장을 검색하면 해당 현장의 현재 재고를 바로 확인할 수 있습니다."
    @close="emit('close')"
    @select="selectCompany"
  >
  </InventoryCompanySearchDialog>

  <Teleport to="body">
    <div
      v-if="selectedCompany"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div class="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0">
            <p class="text-xs font-extrabold text-blue-600">간편조회 결과</p>
            <h2 class="mt-1 truncate text-lg font-extrabold text-slate-900">{{ formatCompany(selectedCompany) }}</h2>
          </div>
          <button
            type="button"
            class="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            @click="selectedCompany = null"
          >
            검색으로 돌아가기
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <div v-if="errorMessage" class="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {{ errorMessage }}
          </div>
          <InventoryStockSummary
            title="현장 현재 재고"
            :description="`${formatCompany(selectedCompany)} 기준`"
            :rows="stockRows"
            :loading="loading"
          />
        </div>

        <footer class="flex justify-end border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            class="h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white hover:bg-slate-800"
            @click="emit('close')"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

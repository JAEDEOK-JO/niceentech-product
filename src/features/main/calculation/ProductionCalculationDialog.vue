<script setup>
import { computed, ref, watch } from 'vue'
import { Loader2, Search, X } from 'lucide-vue-next'
import { useDialog } from '@/composables/useDialog'
import ProductionCalculationMaterialPanel from './ProductionCalculationMaterialPanel.vue'
import {
  deleteCalculationOutboundType,
  filterCalculationCompanies,
  formatCalculationCompany,
  hasCalculationQuantity,
  loadCalculationCompanies,
  loadCalculationMaterials,
  loadCalculationOutbound,
  matchCompanyFromPlanRow,
  saveCalculationOutbound,
} from './productionCalculation.service'
import {
  RAW_MATERIAL_TYPE,
  SUBSIDIARY_MATERIAL_TYPE,
} from '@/features/inventory/services/inventory.service'

const props = defineProps({
  open: { type: Boolean, default: false },
  planRow: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const { alert, confirm } = useDialog()

const companies = ref([])
const selectedCompany = ref(null)
const keyword = ref('')
const activeTab = ref('raw')
const rawItems = ref([])
const subsidiaryItems = ref([])
const rawQuantities = ref({})
const subsidiaryQuantities = ref({})
const loadingCompanies = ref(false)
const loadingMaterials = ref(false)
const saving = ref(false)
const deleting = ref(false)
const rawTransactionId = ref(null)
const subsidiaryTransactionId = ref(null)

const materialTabs = [
  { key: 'raw', label: '원자재' },
  { key: 'subsidiary', label: '부자재' },
]

const selectedCompanyLabel = computed(() => formatCalculationCompany(selectedCompany.value))
const showCompanyResults = computed(() => {
  const query = keyword.value.trim()
  if (!query) return false
  if (selectedCompany.value && query === selectedCompanyLabel.value) return false
  return true
})
const filteredCompanies = computed(() =>
  showCompanyResults.value ? filterCalculationCompanies(companies.value, keyword.value) : [],
)

const currentItems = computed(() =>
  activeTab.value === 'subsidiary' ? subsidiaryItems.value : rawItems.value,
)

const currentQuantities = computed({
  get: () => (activeTab.value === 'subsidiary' ? subsidiaryQuantities.value : rawQuantities.value),
  set: (value) => {
    if (activeTab.value === 'subsidiary') subsidiaryQuantities.value = value
    else rawQuantities.value = value
  },
})

const resetForm = () => {
  selectedCompany.value = null
  keyword.value = ''
  activeTab.value = 'raw'
  rawItems.value = []
  subsidiaryItems.value = []
  rawQuantities.value = {}
  subsidiaryQuantities.value = {}
  rawTransactionId.value = null
  subsidiaryTransactionId.value = null
}

const fillExistingOutbound = async (company) => {
  if (!company?.id || !props.planRow?.id) return
  const existing = await loadCalculationOutbound({
    company,
    planRow: props.planRow,
  })
  rawQuantities.value = existing.rawQuantities
  subsidiaryQuantities.value = existing.subsidiaryQuantities
  rawTransactionId.value = existing.rawTransactionId
  subsidiaryTransactionId.value = existing.subsidiaryTransactionId
}

const selectCompany = async (company) => {
  await applyCompany(company)
  await fillExistingOutbound(company)
}

const applyCompany = async (company, { preserveQuantities = false } = {}) => {
  selectedCompany.value = company
  keyword.value = formatCalculationCompany(company)
  if (!preserveQuantities) {
    rawQuantities.value = {}
    subsidiaryQuantities.value = {}
    rawTransactionId.value = null
    subsidiaryTransactionId.value = null
  }
  if (!company?.id) {
    rawItems.value = []
    subsidiaryItems.value = []
    return
  }
  loadingMaterials.value = true
  try {
    const materials = await loadCalculationMaterials(company.id)
    rawItems.value = materials.rawItems
    subsidiaryItems.value = materials.subsidiaryItems
  } catch (error) {
    rawItems.value = []
    subsidiaryItems.value = []
    await alert(error instanceof Error ? error.message : '품목을 불러오지 못했습니다.')
  } finally {
    loadingMaterials.value = false
  }
}

const loadDialog = async () => {
  resetForm()
  loadingCompanies.value = true
  try {
    companies.value = await loadCalculationCompanies()
    const matched = matchCompanyFromPlanRow(companies.value, props.planRow)
    if (matched) await applyCompany(matched, { preserveQuantities: true })
  } catch (error) {
    companies.value = []
    await alert(error?.message || (error instanceof Error ? error.message : '현장 목록을 불러오지 못했습니다.'))
    return
  } finally {
    loadingCompanies.value = false
  }

  if (!selectedCompany.value) return
  try {
    await fillExistingOutbound(selectedCompany.value)
  } catch (error) {
    await alert(error?.message || (error instanceof Error ? error.message : '산출 내역을 불러오지 못했습니다.'))
  }
}

const save = async () => {
  if (saving.value || loadingMaterials.value) return
  if (!selectedCompany.value?.id) {
    await alert('현장을 선택해주세요.')
    return
  }

  saving.value = true
  try {
    const { hasQuantity } = await saveCalculationOutbound({
      company: selectedCompany.value,
      planRow: props.planRow,
      rawItems: rawItems.value,
      subsidiaryItems: subsidiaryItems.value,
      rawQuantities: rawQuantities.value,
      subsidiaryQuantities: subsidiaryQuantities.value,
    })
    emit('saved', {
      row: props.planRow,
      hasQuantities: hasQuantity || hasCalculationQuantity(rawQuantities.value, subsidiaryQuantities.value),
    })
  } catch (error) {
    await alert(error instanceof Error ? error.message : '산출 저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

const canDeleteActiveTab = computed(() => {
  if (activeTab.value === 'subsidiary') {
    return Boolean(subsidiaryTransactionId.value) || hasCalculationQuantity(subsidiaryQuantities.value)
  }
  return Boolean(rawTransactionId.value) || hasCalculationQuantity(rawQuantities.value)
})

const deleteActiveTab = async () => {
  if (deleting.value || loadingMaterials.value || !selectedCompany.value?.id) return
  const materialType = activeTab.value === 'subsidiary' ? SUBSIDIARY_MATERIAL_TYPE : RAW_MATERIAL_TYPE
  const ok = await confirm('삭제할까요?', { confirmText: '삭제', cancelText: '취소' })
  if (!ok) return

  deleting.value = true
  try {
    await deleteCalculationOutboundType({
      company: selectedCompany.value,
      planRow: props.planRow,
      materialType,
    })
    if (activeTab.value === 'subsidiary') {
      subsidiaryQuantities.value = {}
      subsidiaryTransactionId.value = null
    } else {
      rawQuantities.value = {}
      rawTransactionId.value = null
    }
    emit('saved', {
      row: props.planRow,
      hasQuantities: hasCalculationQuantity(rawQuantities.value, subsidiaryQuantities.value),
    })
  } catch (error) {
    await alert(error instanceof Error ? error.message : '산출 삭제에 실패했습니다.')
  } finally {
    deleting.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) void loadDialog()
  },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="print-hide fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="emit('close')"
    >
      <div class="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0">
            <h2 class="text-base font-extrabold text-slate-900">산출서</h2>
            <p class="mt-1 truncate text-sm font-semibold text-slate-700">
              {{ planRow?.company || '-' }} / {{ planRow?.place || '-' }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </header>

        <div class="border-b border-slate-100 px-5 py-3">
          <div class="relative">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model="keyword"
              type="text"
              class="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
              placeholder="회사명, 현장명"
            />
          </div>
          <div v-if="showCompanyResults" class="mt-2 max-h-40 overflow-y-auto">
            <p v-if="filteredCompanies.length === 0" class="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-sm font-bold text-slate-400">
              검색 없음
            </p>
            <button
              v-for="company in filteredCompanies"
              :key="company.id"
              type="button"
              class="mb-1 flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
              @click="selectCompany(company)"
            >
              <span class="truncate text-sm font-extrabold text-slate-900">{{ formatCalculationCompany(company) }}</span>
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div class="flex gap-1.5">
          <button
            v-for="tab in materialTabs"
            :key="tab.key"
            type="button"
            class="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-extrabold"
            :class="
              activeTab === tab.key
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
          </div>
          <button
            type="button"
            class="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            :disabled="deleting || saving || loadingMaterials || !canDeleteActiveTab"
            @click="deleteActiveTab"
          >
            삭제
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div v-if="loadingCompanies || loadingMaterials" class="flex h-32 items-center justify-center gap-2 text-sm font-bold text-slate-500">
            <Loader2 class="h-4 w-4 animate-spin" />
          </div>
          <ProductionCalculationMaterialPanel
            v-else-if="selectedCompany"
            v-model:quantities="currentQuantities"
            :items="currentItems"
          />
          <div v-else class="py-10 text-center text-sm font-bold text-slate-400">
            현장 선택
          </div>
        </div>

        <footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="emit('close')"
          >
            닫기
          </button>
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
            :disabled="saving || loadingMaterials || !selectedCompany"
            @click="save"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            저장
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

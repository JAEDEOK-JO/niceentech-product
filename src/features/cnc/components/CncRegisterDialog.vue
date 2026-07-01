<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import CncCompanySelectDialog from './CncCompanySelectDialog.vue'
import { searchCncCompanies } from '../services/cncCompanySearch.service'
import type { CncCompanySearchResult, CncItemForm } from '../types/cnc'
import { parseDigitsInput } from '../utils/cncNumericInput'

const props = defineProps<{
  open: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', value: CncItemForm): void
}>()

const form = reactive<CncItemForm>({
  company: '',
  place: '',
  area: '',
  drawingNo: '',
  kind: '',
  quantity: 0,
  length: 0,
})

const companySearchText = ref('')
const companySearchLoading = ref(false)
const companyDialogOpen = ref(false)
const companySearchResults = ref<CncCompanySearchResult[]>([])
const searchError = ref('')

const resetForm = () => {
  form.company = ''
  form.place = ''
  form.area = ''
  form.drawingNo = ''
  form.kind = ''
  form.quantity = 0
  form.length = 0
  companySearchText.value = ''
  companySearchLoading.value = false
  companyDialogOpen.value = false
  companySearchResults.value = []
  searchError.value = ''
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
)

const handleQuantityInput = (event: Event) => {
  form.quantity = parseDigitsInput(event)
}

const handleLengthInput = (event: Event) => {
  form.length = parseDigitsInput(event)
}

const searchCompanies = async () => {
  const term = String(companySearchText.value ?? '').trim()
  if (!term) return

  searchError.value = ''
  companySearchLoading.value = true
  companyDialogOpen.value = true
  companySearchResults.value = []

  try {
    companySearchResults.value = await searchCncCompanies(term)
  } catch (error) {
    searchError.value = error instanceof Error ? error.message : '회사 검색 실패'
  } finally {
    companySearchLoading.value = false
  }
}

const selectCompany = (item: CncCompanySearchResult) => {
  form.company = item.company
  form.place = item.place
  form.drawingNo = item.drawingNo
  companyDialogOpen.value = false
}

const handleSubmit = () => {
  if (!form.kind.trim()) return
  if (form.quantity <= 0) return
  if (form.length <= 0) return
  emit('submit', {
    company: form.company.trim(),
    place: form.place.trim(),
    area: form.area.trim(),
    drawingNo: form.drawingNo.trim(),
    kind: form.kind.trim(),
    quantity: form.quantity,
    length: form.length,
  })
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
  >
    <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-lg font-extrabold text-slate-900">CNC 등록</h2>
        <button type="button" class="text-sm font-bold text-slate-400 hover:text-slate-700" @click="emit('close')">
          닫기
        </button>
      </div>

      <div class="mt-5 grid gap-4">
        <div>
          <p class="mb-2 text-sm font-bold text-slate-700">회사명 검색</p>
          <Input
            v-model="companySearchText"
            type="text"
            class="h-10"
            placeholder="회사명 검색어를 입력하고 엔터"
            :disabled="saving"
            @keydown.enter.prevent="searchCompanies"
          />
          <p v-if="searchError" class="mt-2 text-xs font-bold text-red-600">{{ searchError }}</p>
        </div>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">회사명</span>
          <Input
            v-model="form.company"
            type="text"
            class="h-10"
            placeholder="회사명"
            :disabled="saving"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">현장명</span>
          <Input
            v-model="form.place"
            type="text"
            class="h-10"
            placeholder="현장명"
            :disabled="saving"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">구역명</span>
          <Input
            v-model="form.area"
            type="text"
            class="h-10"
            placeholder="구역명 입력"
            :disabled="saving"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">도번</span>
          <Input
            v-model="form.drawingNo"
            type="text"
            class="h-10"
            placeholder="도번"
            :disabled="saving"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">종류</span>
          <Input
            v-model="form.kind"
            type="text"
            class="h-10"
            placeholder="종류 입력"
            :disabled="saving"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">길이</span>
          <Input
            :model-value="form.length > 0 ? String(form.length) : ''"
            type="text"
            inputmode="numeric"
            class="h-10"
            placeholder="숫자만 입력"
            :disabled="saving"
            @input="handleLengthInput"
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-bold text-slate-700">수량</span>
          <Input
            :model-value="form.quantity > 0 ? String(form.quantity) : ''"
            type="text"
            inputmode="numeric"
            class="h-10"
            placeholder="숫자만 입력"
            :disabled="saving"
            @input="handleQuantityInput"
          />
        </label>
      </div>

      <div class="mt-6 flex gap-2">
        <Button class="flex-1" variant="outline" :disabled="saving" @click="emit('close')">
          취소
        </Button>
        <Button
          class="flex-1 bg-slate-900 text-white hover:bg-slate-800"
          :disabled="saving || !form.kind.trim() || form.quantity <= 0 || form.length <= 0"
          @click="handleSubmit"
        >
          {{ saving ? '저장 중...' : '등록' }}
        </Button>
      </div>
    </div>

    <CncCompanySelectDialog
      :open="companyDialogOpen"
      :loading="companySearchLoading"
      :results="companySearchResults"
      @close="companyDialogOpen = false"
      @select="selectCompany"
    />
  </div>
</template>

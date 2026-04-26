<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  LOT_INFO_TYPES,
  LOT_ROUNDS,
  LOT_TYPES,
  createEmptyQualityForm,
  type CompanyRecord,
  type LotType,
  type QualityFormState,
  type QualityLotInfo,
} from '../types/quality'
import {
  applyLotMeta,
  createLotInfo,
  fetchLotInfos,
  saveQualityForm,
  searchCompanies,
} from '../services/quality.service'
import { useDialog } from '@/composables/useDialog'

const { alert } = useDialog()

const props = defineProps<{
  mode: 'create' | 'update'
  initialDate: string
  initialValue?: QualityFormState
}>()

const emit = defineEmits<{
  saved: [id: number]
  cancel: []
}>()

const form = reactive<QualityFormState>(
  props.initialValue ? { ...props.initialValue } : createEmptyQualityForm(props.initialDate),
)

const saving = ref(false)
const loadingLots = ref(false)
const lotInfos = ref<QualityLotInfo[]>([])
const selectedLotType = ref<LotType>(form.lotType)

// 회사 검색 다이얼로그
const companyDialogOpen = ref(false)
const companyKeyword = ref('')
const companyResults = ref<CompanyRecord[]>([])
const loadingCompanies = ref(false)
const companySearched = ref(false)

// 로트 등록 다이얼로그
const lotDialogOpen = ref(false)
const lotDialogForm = reactive<QualityLotInfo>({
  testDate: form.testDate,
  lotRound: form.lotRound,
  lotType: '백관',
  lotName: '',
  lotNum: 0,
})
const lotSaving = ref(false)

const selectedCompanyLabel = computed(() =>
  form.company && form.place ? `${form.company} ${form.place}` : '회사/현장이 선택되지 않았습니다.',
)

const filteredLotInfos = computed(() =>
  lotInfos.value.filter((info) => info.lotType === selectedLotType.value),
)

const selectedLotValue = computed(() =>
  form.lotNameH && form.lotNumH ? `${form.lotNameH}|${form.lotNumH}` : '',
)

function syncLotMeta() {
  applyLotMeta(form, selectedLotType.value)
}

function openCompanyDialog() {
  companyDialogOpen.value = true
  companyKeyword.value = ''
  companyResults.value = []
  companySearched.value = false
}

function closeCompanyDialog() {
  companyDialogOpen.value = false
}

async function runCompanySearch() {
  if (!companyKeyword.value.trim()) {
    companyResults.value = []
    companySearched.value = true
    return
  }
  loadingCompanies.value = true
  companySearched.value = true
  try {
    companyResults.value = await searchCompanies(companyKeyword.value)
  } catch (error) {
    await alert(error instanceof Error ? error.message : '회사 검색에 실패했습니다.')
  } finally {
    loadingCompanies.value = false
  }
}

function selectCompany(company: CompanyRecord) {
  form.companyId = company.id
  form.company = company.company
  form.place = company.place
  if (!form.initial) {
    form.initial = company.initial
  }
  closeCompanyDialog()
}

function openLotDialog() {
  lotDialogForm.testDate = form.testDate
  lotDialogForm.lotRound = form.lotRound
  lotDialogForm.lotType = selectedLotType.value
  lotDialogForm.lotName = ''
  lotDialogForm.lotNum = 0
  lotDialogOpen.value = true
}

function closeLotDialog() {
  if (lotSaving.value) return
  lotDialogOpen.value = false
}

async function submitLotInfo() {
  if (!lotDialogForm.lotName.trim() || !Number.isFinite(Number(lotDialogForm.lotNum))) {
    await alert('로트 이름과 번호를 입력해 주세요.')
    return
  }
  lotSaving.value = true
  try {
    await createLotInfo({
      ...lotDialogForm,
      lotNum: Number(lotDialogForm.lotNum),
    })
    lotDialogOpen.value = false
    await loadLotInfos()
  } catch (error) {
    await alert(error instanceof Error ? error.message : '로트 정보 저장에 실패했습니다.')
  } finally {
    lotSaving.value = false
  }
}

function selectLotFromDropdown(value: string) {
  if (!value) {
    form.lotNameH = ''
    form.lotNumH = null
    return
  }
  const [lotName, lotNum] = value.split('|')
  form.lotNameH = lotName
  form.lotNumH = Number(lotNum)
}

async function loadLotInfos() {
  loadingLots.value = true
  try {
    lotInfos.value = await fetchLotInfos(form.testDate, form.lotRound)
    if (filteredLotInfos.value.length > 0 && !form.lotNameH) {
      const first = filteredLotInfos.value[0]
      form.lotNameH = first.lotName
      form.lotNumH = first.lotNum
    }
  } catch (error) {
    await alert(error instanceof Error ? error.message : '로트 정보를 불러오지 못했습니다.')
  } finally {
    loadingLots.value = false
  }
}

async function submit() {
  if (!form.company.trim() || !form.place.trim() || !form.area.trim()) {
    await alert('회사명, 현장명, 구역명은 필수입니다.')
    return
  }
  saving.value = true
  try {
    form.lotType = selectedLotType.value
    syncLotMeta()
    const id = await saveQualityForm(form)
    emit('saved', id)
  } catch (error) {
    await alert(error instanceof Error ? error.message : '저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

watch(
  () => form.lotRound,
  async (next, prev) => {
    await loadLotInfos()
    if (prev && next !== prev) {
      const first = filteredLotInfos.value[0]
      if (first) {
        form.lotNameH = first.lotName
        form.lotNumH = first.lotNum
      } else {
        form.lotNameH = ''
        form.lotNumH = null
      }
    }
  },
  { immediate: true },
)

watch(selectedLotType, () => {
  syncLotMeta()
  const first = filteredLotInfos.value[0]
  if (first) {
    form.lotNameH = first.lotName
    form.lotNumH = first.lotNum
  } else {
    form.lotNameH = ''
    form.lotNumH = null
  }
})
</script>

<template>
  <div class="qf-shell">
    <!-- 헤더 -->
    <header class="qf-header">
      <div class="qf-header-title">
        <h2>{{ mode === 'create' ? '검수리스트 등록' : '검수리스트 수정' }}</h2>
        <p class="qf-header-date">{{ form.testDate }}</p>
      </div>
    </header>

    <div class="qf-grid">
      <!-- 기본 정보 -->
      <section class="qf-card">
        <div class="qf-card-head">
          <h3>기본 정보</h3>
        </div>
        <div class="qf-card-body">
          <div class="qf-inline">
            <div class="qf-field qf-field--grow">
              <label>회사 / 현장</label>
              <div class="qf-company-row">
                <div class="qf-company-display" :class="{ 'qf-company-display--empty': !form.company }">
                  {{ selectedCompanyLabel }}
                </div>
                <button type="button" class="qf-btn qf-btn--primary qf-btn--sm" @click="openCompanyDialog">검색</button>
              </div>
            </div>
          </div>

          <div class="qf-inline">
            <div class="qf-field qf-field--grow">
              <label>회사명</label>
              <input v-model="form.company" type="text" />
            </div>
            <div class="qf-field qf-field--grow">
              <label>현장명</label>
              <input v-model="form.place" type="text" />
            </div>
          </div>

          <div class="qf-inline">
            <div class="qf-field qf-field--grow">
              <label>구역명 <span class="qf-required">*</span></label>
              <input v-model="form.area" type="text" placeholder="예: A동" />
            </div>
            <div class="qf-field qf-field--grow">
              <label>도번</label>
              <input v-model="form.initial" type="text" placeholder="예: AB-01" />
            </div>
          </div>
        </div>
      </section>

      <!-- 로트 정보 -->
      <section class="qf-card">
        <div class="qf-card-head">
          <h3>로트 정보</h3>
          <button type="button" class="qf-btn qf-btn--outline qf-btn--sm" @click="openLotDialog">+ 로트 추가</button>
        </div>
        <div class="qf-card-body">
          <div class="qf-field">
            <label>확관 타입</label>
            <div class="qf-radio-group">
              <label v-for="typeName in LOT_TYPES" :key="typeName" class="qf-radio">
                <input v-model="selectedLotType" type="radio" :value="typeName" />
                <span>{{ typeName }}</span>
              </label>
            </div>
          </div>

          <div class="qf-field">
            <label>선택된 로트</label>
            <select :value="selectedLotValue" @change="selectLotFromDropdown(($event.target as HTMLSelectElement).value)">
              <option value="">선택 안 함</option>
              <option
                v-for="info in filteredLotInfos"
                :key="`${info.lotType}-${info.lotName}-${info.lotNum}`"
                :value="`${info.lotName}|${info.lotNum}`"
              >
                {{ info.lotName }} ({{ info.lotNum }})
              </option>
            </select>
            <p v-if="loadingLots" class="qf-helper">로트 정보를 불러오는 중입니다...</p>
            <p v-else-if="filteredLotInfos.length === 0" class="qf-helper qf-helper--warn">
              해당 날짜/차수/타입의 로트가 없습니다. 오른쪽 상단의 로트 추가로 등록하세요.
            </p>
          </div>

          <div class="qf-inline">
            <div class="qf-field qf-field--grow">
              <label>KSD</label>
              <input :value="form.lotKsd" type="text" readonly class="qf-input--readonly" />
            </div>
            <div class="qf-field qf-field--grow">
              <label>인증 구분</label>
              <input :value="form.lotCertification" type="text" readonly class="qf-input--readonly" />
            </div>
            <div class="qf-field qf-field--grow">
              <label>KSD 번호</label>
              <input :value="form.lotKsdNum" type="text" readonly class="qf-input--readonly" />
            </div>
          </div>
        </div>
      </section>

      <!-- 수량 입력 -->
      <section class="qf-card qf-card--full">
        <div class="qf-card-head">
          <h3>수량 입력 <span class="qf-card-hint">(최대 999)</span></h3>
        </div>
        <div class="qf-card-body">
          <div class="qf-count-row">
            <label
              v-for="field in ['a32','a40','a50','a65','m65','m80','m100','m125','m150','m200']"
              :key="field"
              class="qf-count-cell"
            >
              <span>{{ field.toUpperCase() }}</span>
              <input
                v-model.number="form[field as keyof QualityFormState]"
                type="number"
                min="0"
                max="999"
                inputmode="numeric"
              />
            </label>
          </div>

          <div class="qf-inline qf-inline--footer">
            <div class="qf-field qf-field--narrow">
              <label>검사 차수</label>
              <select v-model="form.lotRound" class="qf-input">
                <option v-for="round in LOT_ROUNDS" :key="round" :value="round">{{ round }}</option>
              </select>
            </div>
            <div class="qf-field qf-field--grow">
              <label>선택된 로트명</label>
              <input :value="form.lotNameH" type="text" readonly class="qf-input--readonly" />
            </div>
            <div class="qf-field qf-field--grow">
              <label>선택된 로트번호</label>
              <input :value="form.lotNumH ?? ''" type="text" readonly class="qf-input--readonly" />
            </div>
            <div class="qf-footer-actions">
              <button type="button" class="qf-btn qf-btn--primary" :disabled="saving" @click="submit">
                {{ saving ? '저장 중...' : '저장' }}
              </button>
              <button type="button" class="qf-btn qf-btn--ghost" @click="emit('cancel')">취소</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 회사 검색 다이얼로그 -->
    <div v-if="companyDialogOpen" class="qf-dialog-overlay" @click.self="closeCompanyDialog">
      <div class="qf-dialog">
        <div class="qf-dialog-head">
          <h3>회사 / 현장 검색</h3>
          <button type="button" class="qf-dialog-close" @click="closeCompanyDialog">닫기</button>
        </div>
        <div class="qf-dialog-body">
          <div class="qf-company-search">
            <input
              v-model="companyKeyword"
              type="text"
              placeholder="회사명 또는 현장명을 입력하세요"
              @keyup.enter="runCompanySearch"
            />
            <button type="button" class="qf-btn qf-btn--primary" :disabled="loadingCompanies" @click="runCompanySearch">
              {{ loadingCompanies ? '검색 중...' : '검색' }}
            </button>
          </div>

          <div class="qf-result-list">
            <div v-if="loadingCompanies" class="qf-result-empty">검색 중입니다...</div>
            <div v-else-if="companySearched && companyResults.length === 0" class="qf-result-empty">
              검색 결과가 없습니다.
            </div>
            <div v-else-if="!companySearched" class="qf-result-empty">검색어를 입력하고 엔터를 누르세요.</div>
            <button
              v-for="company in companyResults"
              :key="company.id"
              type="button"
              class="qf-result-item"
              @click="selectCompany(company)"
            >
              <span class="qf-result-company">{{ company.company }}</span>
              <span class="qf-result-place">{{ company.place }}</span>
              <span v-if="company.initial" class="qf-result-initial">도번 {{ company.initial }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 로트 등록 다이얼로그 -->
    <div v-if="lotDialogOpen" class="qf-dialog-overlay" @click.self="closeLotDialog">
      <div class="qf-dialog">
        <div class="qf-dialog-head">
          <h3>로트 등록</h3>
          <button type="button" class="qf-dialog-close" :disabled="lotSaving" @click="closeLotDialog">닫기</button>
        </div>
        <div class="qf-dialog-body">
          <div class="qf-dialog-meta">
            <p><strong>검사일:</strong> {{ lotDialogForm.testDate }}</p>
          </div>
          <div class="qf-field">
            <label>검사 차수</label>
            <select v-model="lotDialogForm.lotRound">
              <option v-for="round in LOT_ROUNDS" :key="round" :value="round">{{ round }}</option>
            </select>
          </div>
          <div class="qf-field">
            <label>로트 타입</label>
            <select v-model="lotDialogForm.lotType">
              <option v-for="typeName in LOT_INFO_TYPES" :key="typeName" :value="typeName">{{ typeName }}</option>
            </select>
          </div>
          <div class="qf-field">
            <label>로트 이름</label>
            <input v-model="lotDialogForm.lotName" type="text" placeholder="예: IFDS" />
          </div>
          <div class="qf-field">
            <label>로트 번호</label>
            <input v-model.number="lotDialogForm.lotNum" type="number" min="0" placeholder="예: 32" />
          </div>
        </div>
        <div class="qf-dialog-actions">
          <button type="button" class="qf-btn qf-btn--ghost" :disabled="lotSaving" @click="closeLotDialog">취소</button>
          <button type="button" class="qf-btn qf-btn--primary" :disabled="lotSaving" @click="submitLotInfo">
            {{ lotSaving ? '등록 중...' : '등록' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qf-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  gap: 12px;
  flex-wrap: wrap;
}

.qf-header-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.qf-header-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.qf-header-date {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.qf-header-actions {
  display: flex;
  gap: 8px;
}

/* 2열 그리드: 기본정보 | 로트정보, 수량입력은 풀폭 */
.qf-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.qf-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.qf-card--full {
  grid-column: 1 / -1;
}

.qf-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.qf-card-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.qf-card-hint {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.qf-card-body {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.qf-inline {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.qf-inline--footer {
  align-items: flex-end;
}

.qf-footer-actions {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.qf-footer-actions .qf-btn {
  height: 34px;
}

.qf-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.qf-field--narrow {
  flex: 0 0 110px;
}

.qf-field--grow {
  flex: 1 1 0;
}

.qf-field label,
.qf-field > span {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.qf-required {
  color: #dc2626;
}

.qf-field input,
.qf-field select {
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #0f172a;
  width: 100%;
  height: 34px;
}

.qf-field input:focus,
.qf-field select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.qf-input--readonly {
  background: #f1f5f9 !important;
  color: #475569 !important;
  cursor: not-allowed;
}

.qf-helper {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}

.qf-helper--warn {
  color: #b45309;
}

.qf-company-row {
  display: flex;
  gap: 6px;
  align-items: stretch;
}

.qf-company-display {
  flex: 1;
  padding: 7px 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1d4ed8;
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  min-height: 34px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qf-company-display--empty {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #94a3b8;
  font-weight: 500;
}

.qf-radio-group {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.qf-radio {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  width: 100%;
  height: 36px;
  text-align: center;
  user-select: none;
}

.qf-radio input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.qf-radio > span {
  white-space: nowrap;
  line-height: 1;
}

.qf-radio:has(input:checked) {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.qf-radio input {
  accent-color: #2563eb;
}

/* 수량 10개 한 줄 */
.qf-count-row {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 8px;
}

.qf-count-cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 0;
}

.qf-count-cell > span {
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #1e3a8a;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 3px 0;
}

.qf-count-cell > input {
  text-align: center;
  font-weight: 800;
  font-size: 16px;
  padding: 4px 2px;
  height: 38px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  width: 100%;
  background: #fff;
  color: #0f172a;
}

.qf-count-cell > input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.qf-count-cell > input::-webkit-outer-spin-button,
.qf-count-cell > input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.qf-count-cell > input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* 버튼 */
.qf-btn {
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.qf-btn--sm {
  padding: 6px 10px;
  font-size: 12px;
  height: 34px;
}

.qf-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.qf-btn--primary {
  background: #2563eb;
  color: #fff;
}

.qf-btn--primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.qf-btn--ghost {
  background: #fff;
  border-color: #d1d5db;
  color: #334155;
}

.qf-btn--ghost:hover:not(:disabled) {
  background: #f8fafc;
}

.qf-btn--outline {
  background: #fff;
  border-color: #2563eb;
  color: #2563eb;
}

.qf-btn--outline:hover:not(:disabled) {
  background: #eff6ff;
}

/* 다이얼로그 */
.qf-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 80;
}

.qf-dialog {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: calc(100vh - 48px);
}

.qf-dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.qf-dialog-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.qf-dialog-close {
  background: transparent;
  border: 0;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
}

.qf-dialog-close:hover:not(:disabled) {
  color: #0f172a;
}

.qf-dialog-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.qf-dialog-meta {
  padding: 10px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  color: #334155;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.qf-dialog-meta p {
  margin: 0;
}

.qf-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
}

.qf-company-search {
  display: flex;
  gap: 8px;
}

.qf-company-search input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
}

.qf-company-search input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.qf-result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.qf-result-empty {
  padding: 36px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

.qf-result-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.qf-result-item:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.qf-result-company {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.qf-result-place {
  font-size: 13px;
  color: #475569;
}

.qf-result-initial {
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 1100px) {
  .qf-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .qf-count-row {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .qf-inline {
    flex-direction: column;
    align-items: stretch;
  }

  .qf-field--narrow {
    flex: 1 1 auto;
  }

  .qf-count-row {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .qf-company-search {
    flex-direction: column;
  }
}
</style>

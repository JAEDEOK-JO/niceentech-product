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
  props.initialValue ? structuredClone(props.initialValue) : createEmptyQualityForm(props.initialDate),
)

const companyKeyword = ref('')
const companyResults = ref<CompanyRecord[]>([])
const loadingCompanies = ref(false)
const saving = ref(false)
const loadingLots = ref(false)
const lotInfos = ref<QualityLotInfo[]>([])
const selectedLotType = ref<LotType>(form.lotType)
const lotInfoForm = reactive<QualityLotInfo>({
  testDate: form.testDate,
  lotRound: form.lotRound,
  lotType: '백관',
  lotName: '',
  lotNum: 0,
})

const selectedCompanyLabel = computed(() =>
  form.company && form.place ? `${form.company} ${form.place}` : '선택된 회사 없음',
)

const filteredLotInfos = computed(() =>
  lotInfos.value.filter((info) => info.lotType === selectedLotType.value),
)

function syncLotMeta() {
  applyLotMeta(form, selectedLotType.value)
}

function selectCompany(company: CompanyRecord) {
  form.companyId = company.id
  form.company = company.company
  form.place = company.place
  if (!form.initial) {
    form.initial = company.initial
  }
  companyKeyword.value = `${company.company} ${company.place}`
  companyResults.value = []
}

function selectLotInfo(info: QualityLotInfo) {
  form.lotNumH = info.lotNum
  form.lotNameH = info.lotName
}

async function loadCompanies() {
  loadingCompanies.value = true
  try {
    companyResults.value = await searchCompanies(companyKeyword.value)
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '회사 검색에 실패했습니다.')
  } finally {
    loadingCompanies.value = false
  }
}

async function loadLotInfos() {
  loadingLots.value = true
  lotInfoForm.testDate = form.testDate
  lotInfoForm.lotRound = form.lotRound
  try {
    lotInfos.value = await fetchLotInfos(form.testDate, form.lotRound)
    if (filteredLotInfos.value.length > 0 && !form.lotNameH) {
      selectLotInfo(filteredLotInfos.value[0])
    }
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '로트 정보를 불러오지 못했습니다.')
  } finally {
    loadingLots.value = false
  }
}

async function saveLotInfo() {
  if (!lotInfoForm.lotName.trim() || !Number.isFinite(Number(lotInfoForm.lotNum))) {
    window.alert('로트 이름과 번호를 입력해 주세요.')
    return
  }

  try {
    await createLotInfo({
      ...lotInfoForm,
      lotNum: Number(lotInfoForm.lotNum),
    })
    lotInfoForm.lotName = ''
    lotInfoForm.lotNum = 0
    await loadLotInfos()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '로트 정보 저장에 실패했습니다.')
  }
}

async function submit() {
  if (!form.company.trim() || !form.place.trim() || !form.area.trim()) {
    window.alert('회사명, 현장명, 구역명은 필수입니다.')
    return
  }

  saving.value = true
  try {
    form.lotType = selectedLotType.value
    syncLotMeta()
    const id = await saveQualityForm(form)
    emit('saved', id)
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}

watch(
  () => form.lotRound,
  async () => {
    await loadLotInfos()
  },
  { immediate: true },
)

watch(selectedLotType, () => {
  syncLotMeta()
  const first = filteredLotInfos.value[0]
  if (first) {
    selectLotInfo(first)
  } else {
    form.lotNameH = ''
    form.lotNumH = null
  }
})
</script>

<template>
  <div class="form-shell">
    <div class="form-header">
      <div>
        <h2>{{ mode === 'create' ? '검수리스트 등록' : '검수리스트 수정' }}</h2>
        <p>{{ form.testDate }}</p>
      </div>
      <div class="form-actions">
        <button type="button" class="ghost-button" @click="emit('cancel')">취소</button>
        <button type="button" class="primary-button" :disabled="saving" @click="submit">
          {{ saving ? '저장 중...' : '저장' }}
        </button>
      </div>
    </div>

    <div class="form-grid">
      <section class="card-section">
        <h3>기본 정보</h3>
        <div class="stack-field">
          <label>검사 차수</label>
          <select v-model="form.lotRound">
            <option v-for="round in LOT_ROUNDS" :key="round" :value="round">{{ round }}</option>
          </select>
        </div>
        <div class="stack-field">
          <label>회사 / 현장 검색</label>
          <div class="inline-field">
            <input
              v-model="companyKeyword"
              type="text"
              placeholder="회사명 또는 현장명 검색"
              @keyup.enter="loadCompanies"
            />
            <button type="button" class="ghost-button" :disabled="loadingCompanies" @click="loadCompanies">
              검색
            </button>
          </div>
          <div class="helper-text">{{ selectedCompanyLabel }}</div>
          <div v-if="companyResults.length" class="search-result-list">
            <button
              v-for="company in companyResults"
              :key="company.id"
              type="button"
              class="search-result-item"
              @click="selectCompany(company)"
            >
              {{ company.company }} {{ company.place }}
            </button>
          </div>
        </div>
        <div class="two-column">
          <div class="stack-field">
            <label>회사명</label>
            <input v-model="form.company" type="text" />
          </div>
          <div class="stack-field">
            <label>현장명</label>
            <input v-model="form.place" type="text" />
          </div>
        </div>
        <div class="two-column">
          <div class="stack-field">
            <label>구역명</label>
            <input v-model="form.area" type="text" />
          </div>
          <div class="stack-field">
            <label>도번</label>
            <input v-model="form.initial" type="text" />
          </div>
        </div>
      </section>

      <section class="card-section">
        <h3>로트 정보</h3>
        <div class="stack-field">
          <label>확관 타입</label>
          <div class="radio-group">
            <label v-for="typeName in LOT_TYPES" :key="typeName" class="radio-item">
              <input v-model="selectedLotType" type="radio" :value="typeName" />
              {{ typeName }}
            </label>
          </div>
        </div>

        <div class="two-column">
          <div class="stack-field">
            <label>선택된 로트</label>
            <select
              :value="form.lotNameH && form.lotNumH ? `${form.lotNameH}|${form.lotNumH}` : ''"
              @change="
                (() => {
                  const [lotName, lotNum] = (($event.target as HTMLSelectElement).value || '|').split('|')
                  selectLotInfo({
                    testDate: form.testDate,
                    lotRound: form.lotRound,
                    lotType: selectedLotType,
                    lotName,
                    lotNum: Number(lotNum),
                  })
                })()
              "
            >
              <option value="">선택 안 함</option>
              <option v-for="info in filteredLotInfos" :key="`${info.lotType}-${info.lotName}-${info.lotNum}`" :value="`${info.lotName}|${info.lotNum}`">
                {{ info.lotName }} ({{ info.lotNum }})
              </option>
            </select>
            <div class="helper-text" v-if="loadingLots">로트 정보를 불러오는 중입니다.</div>
          </div>
          <div class="stack-field">
            <label>로트 정보 추가</label>
            <div class="three-column">
              <input v-model="lotInfoForm.lotName" type="text" placeholder="로트 이름" />
              <input v-model.number="lotInfoForm.lotNum" type="number" min="0" placeholder="로트 번호" />
              <select v-model="lotInfoForm.lotType">
                <option v-for="typeName in LOT_INFO_TYPES" :key="typeName" :value="typeName">{{ typeName }}</option>
              </select>
            </div>
            <button type="button" class="ghost-button" @click="saveLotInfo">로트 등록</button>
          </div>
        </div>

        <div class="three-column">
          <div class="stack-field">
            <label>KSD</label>
            <input v-model="form.lotKsd" type="text" />
          </div>
          <div class="stack-field">
            <label>인증 구분</label>
            <input v-model="form.lotCertification" type="text" />
          </div>
          <div class="stack-field">
            <label>KSD 번호</label>
            <input v-model="form.lotKsdNum" type="text" />
          </div>
        </div>
      </section>

      <section class="card-section span-2">
        <h3>수량 입력</h3>
        <div class="count-grid">
          <label v-for="field in ['a32','a40','a50','a65','m65','m80','m100','m125','m150','m200']" :key="field" class="stack-field">
            <span>{{ field.toUpperCase() }}</span>
            <input v-model.number="form[field as keyof QualityFormState]" type="number" min="0" />
          </label>
        </div>
        <div class="three-column">
          <div class="stack-field">
            <label>확관 시작 번호</label>
            <input v-model.number="form.lotNumStartH" type="number" min="0" />
          </div>
          <div class="stack-field">
            <label>선택된 로트명</label>
            <input v-model="form.lotNameH" type="text" />
          </div>
          <div class="stack-field">
            <label>선택된 로트번호</label>
            <input v-model.number="form.lotNumH" type="number" min="0" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

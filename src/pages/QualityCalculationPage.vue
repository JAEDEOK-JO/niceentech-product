<script setup lang="ts">
import { onMounted, ref } from 'vue'
import '@/features/quality-list/quality.css'
import { fetchCalculationBundle } from '@/features/quality-list/services/quality.service'
import type { CompanyRecord } from '@/features/quality-list/types/quality'

const companies = ref<CompanyRecord[]>([])
const selectedCompanyId = ref<number | null>(null)
const loading = ref(false)
const pipeTypes = ref<Array<Record<string, unknown>>>([])
const fittingTypes = ref<Array<Record<string, unknown>>>([])
const pipeTransactions = ref<Array<Record<string, unknown>>>([])
const fittingTransactions = ref<Array<Record<string, unknown>>>([])

async function load(companyId: number) {
  loading.value = true
  try {
    const bundle = await fetchCalculationBundle(companyId)
    companies.value = bundle.companies
    pipeTypes.value = bundle.pipeTypes
    fittingTypes.value = bundle.fittingTypes
    pipeTransactions.value = bundle.pipeTransactions
    fittingTransactions.value = bundle.fittingTransactions
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '계산 데이터를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const bundle = await fetchCalculationBundle(0)
    companies.value = bundle.companies
    if (companies.value.length > 0) {
      selectedCompanyId.value = companies.value[0].id
      await load(companies.value[0].id)
    }
  } catch {
    // 초기 회사 목록 로드 실패는 화면에서 재시도한다.
  }
})
</script>

<template>
  <div class="page-shell">
    <section class="card-section">
      <div class="form-header">
        <div>
          <h2>수량 계산 / 재고 참고</h2>
          <p>`calculation_page.dart`를 웹 기준으로 옮기기 위한 초기 화면입니다.</p>
        </div>
      </div>

      <div class="stack-field">
        <label>회사 선택</label>
        <div class="inline-field">
          <select v-model.number="selectedCompanyId">
            <option v-for="company in companies" :key="company.id" :value="company.id">
              {{ company.company }} {{ company.place }}
            </option>
          </select>
          <button
            type="button"
            class="ghost-button"
            :disabled="!selectedCompanyId || loading"
            @click="selectedCompanyId && load(selectedCompanyId)"
          >
            조회
          </button>
        </div>
      </div>

      <div class="stats-grid">
        <article class="stat-card">
          <strong>배관 타입</strong>
          <span>{{ pipeTypes.length }}건</span>
        </article>
        <article class="stat-card">
          <strong>피팅 타입</strong>
          <span>{{ fittingTypes.length }}건</span>
        </article>
        <article class="stat-card">
          <strong>배관 거래</strong>
          <span>{{ pipeTransactions.length }}건</span>
        </article>
        <article class="stat-card">
          <strong>피팅 거래</strong>
          <span>{{ fittingTransactions.length }}건</span>
        </article>
      </div>

      <div class="two-column">
        <div class="card-section">
          <h3>배관 타입</h3>
          <pre>{{ pipeTypes }}</pre>
        </div>
        <div class="card-section">
          <h3>피팅 타입</h3>
          <pre>{{ fittingTypes }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'

const emit = defineEmits(['go-home'])

const departments = [
  {
    key: 'sales',
    name: '영업부',
    badge: '김두일 이사',
    summary: '신규 영업, 현장 납기 및 AS, 월 물량 보고를 담당합니다.',
    pageTasks: [
      '신규영업 : 아파트 외 물류창고, 지식산업센터, 일반업무용 건물 60% 이상 확보',
      '매출처 현장 납기 및 AS 관리',
      '매월 잔여물량 및 신규 예상 물량 보고서 작성',
      '동종업계 현황 조사 및 보고',
    ],
    standardRole: {
      department: '영업부',
      position: '이사',
      owner: '김두일',
      duties: [
        '신규 영업 전략 수립 및 실행',
        '물류창고, 지식산업센터 등 비아파트 영업 60% 이상 확보',
        '현장 납기 및 AS 총괄',
        '월별 잔여 및 신규 예상 물량 보고',
      ],
    },
    raci: {
      responsible: ['수주 및 신규영업', '출하 및 납기', 'AS 및 현장관리'],
      consulted: ['물량산출 및 설계', '생산계획'],
      informed: ['자재관리'],
    },
    kpi: '신규수주 확대',
    kpiTarget: '비아파트 수주 60% 이상',
    monthlyReport: '잔여 및 신규예상 물량',
    towerItems: ['월 목표 매출', '현재 매출', '신규 수주', '비아파트 비중(%)', '납기 준수율(%)', 'AS 발생 건수'],
    tone: 'indigo',
  },
  {
    key: 'design',
    name: '설계팀',
    badge: '김호연 부장',
    summary: '도면 입도 후 산출·견적·작도와 납기 일정 조율을 담당합니다.',
    pageTasks: [
      '도면 입도 후 1주일 내 물량산출, 견적 및 작도 완료',
      '현장 여건에 따른 설계 조율',
      '거래명세서, 자재산출 및 청구 재고현황 관리',
      '영업부와 납기 일정 조율 및 월별 물량 보고',
      '생산부와 생산 일정 조율',
    ],
    standardRole: {
      department: '설계팀',
      position: '부장',
      owner: '김호연',
      duties: [
        '도면 입도 후 1주 내 물량산출 및 견적',
        '작도 및 설계 검토',
        '자재산출 및 재고 연계',
        '영업·생산부 납기 일정 조율',
      ],
    },
    raci: {
      responsible: ['물량산출 및 설계'],
      consulted: ['수주 및 신규영업', '자재관리', '생산계획', '출하 및 납기', 'AS 및 현장관리'],
      informed: [],
    },
    kpi: '설계 리드타임',
    kpiTarget: '도면입도 후 7일 내 산출 완료',
    monthlyReport: '설계 진행현황',
    towerItems: ['생산일정 계획', '납기 준수율(%)', '납기 위험', '발주 필요 항목'],
    tone: 'emerald',
  },
  {
    key: 'operations',
    name: '공무부',
    badge: '안상기 부장',
    summary: '출하, 포장, 자재, 외주 가공품과 차량·시설 관리를 담당합니다.',
    pageTasks: [
      '출하업무 및 물량팀 생산 조율',
      '포장, 누락 및 누수 관련 관리',
      '당사 및 발주처 자재관리',
      '월별 자재 재고조사 (외주업체 포함)',
      '차량관리(지게차 제외)',
      '자재 및 고철 관리',
      '통신 및 CCTV 관리',
      '쓰레기 처리 및 외주 가공품 관리',
    ],
    standardRole: {
      department: '공무부',
      position: '부장',
      owner: '안상기',
      duties: [
        '출하 및 포장 관리',
        '자재 및 외주 가공품 관리',
        '재고 조사 및 발주처 자재관리',
        '차량·통신·CCTV 및 시설 관리',
      ],
    },
    raci: {
      responsible: ['자재관리', '출하 및 납기'],
      consulted: ['물량산출 및 설계', 'AS 및 현장관리'],
      informed: ['수주 및 신규영업', '생산계획'],
    },
    kpi: '자재 및 출하 정확도',
    kpiTarget: '재고오차 최소화 / 납기 누락 ZERO',
    monthlyReport: '자재 및 재고현황',
    towerItems: ['출하 완료', '납기 지연 건수', '주요 자재 재고', '외주 자재 포함 여부', '재고 오차율(%)', '발주 필요 항목'],
    tone: 'amber',
  },
  {
    key: 'production',
    name: '생산부',
    badge: '조재덕 차장',
    summary: '도면 기준 제품 생산, 생산 인력 관리, 설비 및 장비 점검 업무를 담당합니다.',
    pageTasks: [
      '작도 도면 기준 메인관, 가지관, 나사, 그루브 생산',
      '생산인력 인사관리',
      '식당, 숙소, 휴게실 등 물건 및 부속건물 관리',
      '지게차 및 공장 내 장비 재고 파악 및 정기 점검',
    ],
    standardRole: {
      department: '생산부',
      position: '차장',
      owner: '조재덕',
      duties: [
        '도면 기준 제품 생산 총괄',
        '생산 인력 관리',
        '공장 설비 및 장비 점검',
        '지게차 및 공장 운영 관리',
      ],
    },
    raci: {
      responsible: ['생산계획'],
      consulted: ['물량산출 및 설계', '자재관리', '출하 및 납기'],
      informed: ['수주 및 신규영업', 'AS 및 현장관리'],
    },
    kpi: '생산 효율',
    kpiTarget: '계획대비 생산달성률 95% 이상',
    monthlyReport: '생산실적 및 설비점검',
    towerItems: ['생산계획', '생산실적', '생산 달성률(%)', '설비 이상 여부', '인력 부족 여부'],
    tone: 'rose',
  },
]

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
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Department Guide</p>
          <h1 class="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">부서별 업무 · 권한 · 보고 항목</h1>
          <p class="mt-2 text-sm text-slate-600">대표 보고용으로 부서별 담당 업무, 권한, KPI, 보고 항목을 바로 볼 수 있게 구성했습니다.</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-home')">홈으로</Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div class="flex flex-wrap gap-2">
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

        <div class="mt-5 rounded-3xl border p-5 md:p-6" :class="getTone(currentDepartment.tone).panel">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 class="mt-1 text-2xl font-extrabold text-slate-900">{{ currentDepartment.name }}</h2>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{{ currentDepartment.summary }}</p>
            </div>
            <span class="inline-flex rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap" :class="getTone(currentDepartment.tone).badge">
              {{ currentDepartment.badge }}
            </span>
          </div>

          <div class="mt-5 grid gap-4 xl:grid-cols-2">
            <article class="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-extrabold text-slate-900">부서 업무</p>
                <span class="text-xs font-semibold text-slate-500">{{ currentDepartment.standardRole.position }}</span>
              </div>
              <p class="mt-2 text-sm font-semibold text-slate-700">{{ currentDepartment.standardRole.owner }}</p>
              <ul class="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                <li v-for="task in currentDepartment.pageTasks" :key="task">• {{ task }}</li>
              </ul>
            </article>

            <article class="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm">
              <p class="text-sm font-extrabold text-slate-900">업무분장 및 권한</p>
              <div class="mt-4 grid flex-1 gap-3 md:grid-cols-3">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">실무 담당 (R)</p>
                  <ul class="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                    <li v-for="item in currentDepartment.raci.responsible" :key="item">• {{ item }}</li>
                  </ul>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">협의 대상 (C)</p>
                  <ul class="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                    <li v-for="item in currentDepartment.raci.consulted" :key="item">• {{ item }}</li>
                  </ul>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">공유 대상 (I)</p>
                  <ul class="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                    <li v-if="currentDepartment.raci.informed.length === 0" class="text-slate-500">• 없음</li>
                    <li v-for="item in currentDepartment.raci.informed" :key="item">• {{ item }}</li>
                  </ul>
                </div>
              </div>
            </article>

            <article class="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm">
              <p class="text-sm font-extrabold text-slate-900">KPI 및 월간 보고</p>
              <div class="mt-4 grid flex-1 gap-3 md:grid-cols-2">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">KPI</p>
                  <p class="mt-2 text-sm font-bold text-slate-900">{{ currentDepartment.kpi }}</p>
                  <p class="mt-2 text-sm leading-6 text-slate-700">{{ currentDepartment.kpiTarget }}</p>
                </div>
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs font-bold text-slate-500">월간 보고</p>
                  <p class="mt-2 text-sm leading-6 text-slate-700">{{ currentDepartment.monthlyReport }}</p>
                </div>
              </div>
            </article>

            <article class="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm">
              <p class="text-sm font-extrabold text-slate-900">대표이사 주요 보고 지표</p>
              <ul class="mt-4 grid flex-1 gap-2 text-sm leading-6 text-slate-700 md:grid-cols-2">
                <li
                  v-for="item in currentDepartment.towerItems"
                  :key="item"
                  class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  {{ item }}
                </li>
              </ul>
            </article>
          </div>
        </div>
      </section>
    </main>
  </section>
</template>

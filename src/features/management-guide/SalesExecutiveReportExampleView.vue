<script setup>
import { ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'

const emit = defineEmits(['go-back'])
const currentPage = ref(1)
const reportMonthLabel = `${new Date().getMonth() + 1}월`

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('ko-KR')}원`
const formatPercent = (value) => `${Number(value || 0).toLocaleString('ko-KR')}%`
const formatHead = (value) => `${Number(value || 0).toLocaleString('ko-KR')}헤드`
const salesProgress = 85

const summaryCards = [
  {
    label: '현재 매출',
    value: formatCurrency(510000000),
    note: `${reportMonthLabel} 누적 실적`,
    tone: 'bg-slate-50 border-slate-200 text-slate-800',
  },
  {
    label: '신규 수주',
    value: formatHead(1240),
    note: `${reportMonthLabel} 확정 헤드수`,
    tone: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  },
  {
    label: '신규 수주 예정',
    value: formatHead(1680),
    note: '협의 진행 예상 헤드수',
    tone: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  },
  {
    label: 'AS 발생 건수',
    value: '6건',
    note: `${reportMonthLabel} 접수 누계`,
    tone: 'bg-rose-50 border-rose-200 text-rose-800',
  },
]

const targetSummary = {
  monthlyTarget: formatCurrency(600000000),
  achievementRate: formatPercent(salesProgress),
  nonApartmentRatio: formatPercent(63),
  confirmedHead: formatHead(1240),
  expectedHead: formatHead(1680),
}

const newOrders = [
  { date: '03월 04일', company: '진흥이엔지', place: '당산 리버파크', headCount: formatHead(420), status: '계약완료' },
  { date: '03월 08일', company: '동산테크', place: '부산 우암 효성해링턴 1공구', headCount: formatHead(310), status: '계약완료' },
  { date: '03월 13일', company: '우진이엔지', place: '의왕 백운밸리 업무시설', headCount: formatHead(510), status: '계약완료' },
]

const expectedOrders = [
  { expectedDate: '03월 22일', company: '우리이엔씨', place: '대전머크코리아', headCount: formatHead(560), stage: '견적 제출' },
  { expectedDate: '03월 26일', company: '환경이엔지', place: '반포 THE H', headCount: formatHead(680), stage: '최종 협의' },
  { expectedDate: '03월 29일', company: '화성엔지니어링', place: '과천 지타운', headCount: formatHead(440), stage: '발주 검토' },
]

const asIssues = [
  { reportedAt: '03월 05일', company: '다원이엔지', place: '충북음성 석미아데나', issue: '누수 관련 재확인', status: '처리중' },
  { reportedAt: '03월 09일', company: '다원기업', place: '반포 현대 5공구', issue: '현장 추가 자재 요청', status: '접수' },
  { reportedAt: '03월 12일', company: '엡스엔지니어링', place: '석남동 가로주택', issue: '도면 변경 후 재납품 문의', status: '완료' },
]
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Sales Meeting Report</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">영업부 대표 보고</h1>
          <p class="mt-2 text-[13px] text-slate-600">현재 매출, 신규 수주, 신규 수주 예정, AS 발생 건수를 중심으로 구성했습니다.</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-back')">가이드로 돌아가기</Button>
      </div>

      <div class="mx-auto flex max-w-7xl gap-1 px-4 pb-3 md:px-6">
        <button
          type="button"
          class="rounded-xl px-4 py-2.5 text-[13px] font-bold transition"
          :class="currentPage === 1 ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="currentPage = 1"
        >
          1페이지 · 요약본
        </button>
        <button
          type="button"
          class="rounded-xl px-4 py-2.5 text-[13px] font-bold transition"
          :class="currentPage === 2 ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="currentPage = 2"
        >
          2페이지 · 디테일
        </button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div v-show="currentPage === 1" class="space-y-6">
        <section class="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-indigo-50 p-6 shadow-sm">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p class="text-[12px] font-bold uppercase tracking-[0.16em] text-emerald-700">{{ reportMonthLabel }} Sales KPI</p>
              <h2 class="mt-2 text-2xl font-extrabold text-slate-900">{{ reportMonthLabel }} 영업 실적 요약</h2>
              <p class="mt-2 text-sm text-slate-600">매출은 금액 기준으로, 신규 수주와 수주 예정은 헤드수 기준으로 보고합니다.</p>
              <div class="mt-4 flex flex-wrap gap-2 text-[12px] font-semibold">
                <span class="rounded-full border border-emerald-200 bg-white px-3 py-1 text-slate-700">월 목표 {{ targetSummary.monthlyTarget }}</span>
                <span class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">달성률 {{ targetSummary.achievementRate }}</span>
                <span class="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">확정 수주 {{ targetSummary.confirmedHead }}</span>
                <span class="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700">수주 예정 {{ targetSummary.expectedHead }}</span>
                <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">비아파트 비중 {{ targetSummary.nonApartmentRatio }}</span>
              </div>
            </div>
            <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
              <p class="text-[12px] font-bold text-emerald-700">현재 매출</p>
              <p class="mt-1 text-4xl font-extrabold text-slate-900">{{ summaryCards[0].value }}</p>
              <div class="mt-4 w-60 max-w-full text-left">
                <div class="mb-2 flex items-center justify-between text-[12px] font-semibold text-slate-700">
                  <span>매출 진행률</span>
                  <span>{{ targetSummary.achievementRate }}</span>
                </div>
                <div class="h-4 rounded-full bg-slate-200">
                  <div class="h-4 rounded-full bg-emerald-500" :style="{ width: `${salesProgress}%` }" />
                </div>
                <div class="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>현재 {{ summaryCards[0].value }}</span>
                  <span>목표 {{ targetSummary.monthlyTarget }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div v-for="card in summaryCards" :key="card.label" class="rounded-2xl border p-4" :class="card.tone">
              <p class="text-[13px] font-bold">{{ card.label }}</p>
              <p class="mt-2 text-2xl font-extrabold">{{ card.value }}</p>
              <p class="mt-1 text-[11px] font-semibold opacity-80">{{ card.note }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div>
            <article class="rounded-2xl border border-slate-200 bg-white p-5">
              <p class="text-[13px] font-extrabold text-slate-900">영업부 요약</p>
              <ul class="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                <li>물류센터/지식산업센터 중심으로 비아파트 수주 비중 63% 유지</li>
                <li>{{ reportMonthLabel }} 말 예정 물량 중 2건은 최종 협의 단계로 다음 달 매출 연결 가능성 높음</li>
                <li>AS 6건 중 4건은 현장 즉시 대응으로 3일 내 마감 목표</li>
              </ul>
            </article>
          </div>
        </section>
      </div>

      <div v-show="currentPage === 2" class="space-y-6">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[13px] font-extrabold text-slate-900">신규 수주 목록</p>
              <p class="mt-1 text-[12px] text-slate-500">{{ reportMonthLabel }} 계약 완료 기준</p>
            </div>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-700">{{ newOrders.length }}건</span>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr class="bg-slate-50 text-slate-600">
                  <th class="border border-slate-200 px-3 py-2 text-center">일자</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">헤드수</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in newOrders" :key="`${row.date}-${row.place}`" class="bg-white">
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.date }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ row.headCount }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[13px] font-extrabold text-slate-900">신규 수주 예정 목록</p>
              <p class="mt-1 text-[12px] text-slate-500">협의/견적 진행 기준</p>
            </div>
            <span class="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-700">{{ expectedOrders.length }}건</span>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr class="bg-slate-50 text-slate-600">
                  <th class="border border-slate-200 px-3 py-2 text-center">예정일</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">예상 헤드수</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">진행단계</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in expectedOrders" :key="`${row.expectedDate}-${row.place}`" class="bg-white">
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.expectedDate }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-900">{{ row.headCount }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.stage }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[13px] font-extrabold text-slate-900">AS 발생 목록</p>
              <p class="mt-1 text-[12px] text-slate-500">{{ reportMonthLabel }} 접수 기준</p>
            </div>
            <span class="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700">{{ asIssues.length }}건</span>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr class="bg-slate-50 text-slate-600">
                  <th class="border border-slate-200 px-3 py-2 text-center">접수일</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">내용</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in asIssues" :key="`${row.reportedAt}-${row.place}`" class="bg-white">
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.reportedAt }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.issue }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  </section>
</template>

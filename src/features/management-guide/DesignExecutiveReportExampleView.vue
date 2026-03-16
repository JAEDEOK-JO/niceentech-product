<script setup>
import Button from '@/components/ui/button/Button.vue'

const emit = defineEmits(['go-back'])

const summaryCards = [
  { label: '금주 검수 예정', value: '28건', note: 'test_date 기준', tone: 'bg-slate-50 border-slate-200 text-slate-800' },
  { label: '산출 완료율', value: '82%', note: '산출여부 기준', tone: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  { label: '납기 위험', value: '5건', note: '납기일 임박 + 미산출', tone: 'bg-amber-50 border-amber-200 text-amber-800' },
  { label: '납기 준수율', value: '91%', note: '출하일 <= 납기일', tone: 'bg-blue-50 border-blue-200 text-blue-800' },
]

const monthlyStats = [
  {
    label: '3월 검수 예정',
    value: '112건',
    description: '3월 전체 test_date 기준',
  },
  {
    label: '3월 산출 완료',
    value: '96건',
    description: '산출 완료 처리 누적',
  },
  {
    label: '3월 납기 준수',
    value: '91%',
    description: '출하일 기준 납기 준수율',
  },
  {
    label: '3월 납기 위험',
    value: '8건',
    description: '납기 임박 + 미산출 누적',
  },
]

const shipmentChecks = [
  {
    site: '부천 데이터센터',
    dueDate: '03/14',
    shipmentDate: '03/13',
    status: '준수',
  },
  {
    site: '과천 지타운',
    dueDate: '03/15',
    shipmentDate: '03/15',
    status: '준수',
  },
  {
    site: '남원 KT&G 현장',
    dueDate: '03/12',
    shipmentDate: '03/13',
    status: '지연',
  },
]

const materialChecks = [
  {
    item: '100A 엘보',
    site: '평택 복합시설',
    status: '공무부 확인 필요',
    owner: '공무부 / 설계팀',
  },
  {
    item: '메인관 자재',
    site: '동탄 물류센터 A동',
    status: '수량 재산출 필요',
    owner: '설계팀',
  },
  {
    item: '그루브 부속',
    site: '김포 지식산업센터',
    status: '발주 예정',
    owner: '공무부',
  },
]
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Design Meeting Example</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">설계팀 화요일 회의 보고 예시</h1>
          <p class="mt-2 text-[13px] text-slate-600">주간 보고는 특정 생산계획 기준으로, 통계는 월 누적으로 같이 보는 예시입니다.</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-back')">가이드로 돌아가기</Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-[13px] font-bold text-slate-500">2026년 3월 2주차</p>
            <h2 class="mt-1 text-xl font-extrabold text-slate-900">2026년 03월 18일 생산계획에 대한 설계부 현황</h2>
            <p class="mt-2 text-[13px] text-slate-600">해당 생산계획의 설계 상태를 보고, 아래 월간 누적 통계로 전체 흐름을 함께 확인하는 화면입니다.</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-bold text-slate-700">
            작성자 김호연 부장
          </div>
        </div>

        <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div v-for="card in summaryCards" :key="card.label" class="rounded-3xl border p-4" :class="card.tone">
            <p class="text-[13px] font-bold">{{ card.label }}</p>
            <p class="mt-3 text-[22px] font-extrabold">{{ card.value }}</p>
            <p class="mt-2 text-[11px] font-semibold opacity-80">{{ card.note }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[13px] font-extrabold text-slate-900">3월 월간 통계</p>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">월 누적</span>
        </div>
        <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div v-for="item in monthlyStats" :key="item.label" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p class="text-[13px] font-bold text-slate-900">{{ item.label }}</p>
            <p class="mt-3 text-[22px] font-extrabold text-slate-900">{{ item.value }}</p>
            <p class="mt-2 text-[12px] text-slate-600">{{ item.description }}</p>
          </div>
        </div>
      </section>

      <section class="grid gap-5 xl:grid-cols-1">
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[13px] font-extrabold text-slate-900">출하 기준 납기 준수 예시</p>
            <span class="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-700">shipment_date 기준</span>
          </div>
          <div class="mt-4 space-y-3">
            <div v-for="item in shipmentChecks" :key="item.site" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div class="flex items-center justify-between gap-3">
                <p class="text-[13px] font-bold text-slate-900">{{ item.site }}</p>
                <span
                  class="rounded-full px-3 py-1 text-[11px] font-bold"
                  :class="item.status === '준수' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                >
                  {{ item.status }}
                </span>
              </div>
              <div class="mt-3 grid gap-2 text-[13px] text-slate-700 md:grid-cols-2">
                <p>납기일 {{ item.dueDate }}</p>
                <p>출하일 {{ item.shipmentDate }}</p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div class="flex items-center justify-between gap-3">
          <p class="text-[13px] font-extrabold text-slate-900">자재 확인 / 발주 필요 항목</p>
          <span class="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700">3건</span>
        </div>
        <div class="mt-4 grid gap-3 md:grid-cols-3">
          <div v-for="item in materialChecks" :key="`${item.item}-${item.site}`" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[13px] font-bold text-slate-900">{{ item.item }}</p>
              <span class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">{{ item.status }}</span>
            </div>
            <p class="mt-3 text-[13px] text-slate-700">현장 {{ item.site }}</p>
            <p class="mt-1 text-[13px] text-slate-600">확인 대상 {{ item.owner }}</p>
          </div>
        </div>
      </section>
    </main>
  </section>
</template>

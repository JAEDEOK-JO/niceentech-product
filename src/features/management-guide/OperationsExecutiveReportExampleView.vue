<script setup>
import { ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'

const emit = defineEmits(['go-back'])
const currentPage = ref(1)
const reportMonthLabel = `${new Date().getMonth() + 1}월`

const formatTon = (value) => `${Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}톤`

const summaryCards = [
  {
    label: '파이프 재고',
    value: formatTon(148.6),
    note: '주요 규격 합산 실재고',
    tone: 'bg-slate-50 border-slate-200 text-slate-800',
  },
  {
    label: `${reportMonthLabel} 총 입고 톤수`,
    value: formatTon(92.4),
    note: '당월 누적 입고량',
    tone: 'bg-sky-50 border-sky-200 text-sky-800',
  },
  {
    label: `${reportMonthLabel} 사용 톤수`,
    value: formatTon(74.1),
    note: '생산/출하 반영 사용량',
    tone: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  },
  {
    label: '총 잔고 톤수',
    value: formatTon(218.7),
    note: '날짜 무관 전체 잔고',
    tone: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  },
  {
    label: '오제작·누락분',
    value: '7건',
    note: '오제작 3건 / 누락 4건',
    tone: 'bg-rose-50 border-rose-200 text-rose-800',
  },
]

const inventoryHighlights = [
  { label: '메인관 재고', value: formatTon(84.2), tone: 'bg-white border-slate-200 text-slate-900' },
  { label: '가지관 재고', value: formatTon(39.5), tone: 'bg-white border-slate-200 text-slate-900' },
  { label: '특수 규격 재고', value: formatTon(24.9), tone: 'bg-white border-slate-200 text-slate-900' },
]

const misproductionRows = [
  {
    reportedAt: '03월 06일',
    company: '진흥이엔지',
    place: '당산 리버파크',
    area: '메인관 수정용 니플요청',
    issue: '오제작',
    detail: '규격 상이로 재가공 필요',
    status: '처리중',
  },
  {
    reportedAt: '03월 11일',
    company: '우진이엔지',
    place: '의왕 백운밸리 업무시설',
    area: '지하1층 2개구역',
    issue: '오제작',
    detail: '길이 오차 발생',
    status: '완료',
  },
  {
    reportedAt: '03월 14일',
    company: '환경이엔지',
    place: '반포 THE H',
    area: '218동 1~4호 전실',
    issue: '오제작',
    detail: '부속 규격 변경 요청 반영 누락',
    status: '확인중',
  },
]

const shortageRows = [
  {
    reportedAt: '03월 05일',
    company: '동산테크',
    place: '부산 우암 효성해링턴 1공구',
    area: '피트니스센터',
    issue: '누락',
    detail: '티 부속 2EA 누락',
    status: '출고완료',
  },
  {
    reportedAt: '03월 10일',
    company: '다원이엔지',
    place: '충북음성 석미아데나',
    area: '지하주차장',
    issue: '누락',
    detail: '메인관 패킹 누락',
    status: '처리중',
  },
  {
    reportedAt: '03월 13일',
    company: '다원기업',
    place: '반포 현대 5공구',
    area: '1층 입상 제작요청분',
    issue: '누락',
    detail: '부속 4종 미동봉',
    status: '접수',
  },
  {
    reportedAt: '03월 15일',
    company: '우리이엔씨',
    place: '대전머크코리아',
    area: 'SP촛대 발주건',
    issue: '누락',
    detail: '촛대 부속 1SET 누락',
    status: '확인중',
  },
]
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations Meeting Report</p>
          <h1 class="mt-1 text-lg font-extrabold text-slate-900 md:text-xl">공무부 대표 보고</h1>
          <p class="mt-2 text-[13px] text-slate-600">파이프 재고, 입고/사용 톤수, 잔고톤수와 오제작·누락분 중심으로 구성했습니다.</p>
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
        <section class="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-6 shadow-sm">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p class="text-[12px] font-bold uppercase tracking-[0.16em] text-amber-700">{{ reportMonthLabel }} Operations KPI</p>
              <h2 class="mt-2 text-2xl font-extrabold text-slate-900">{{ reportMonthLabel }} 공무부 재고/자재 요약</h2>
              <p class="mt-2 text-sm text-slate-600">재고와 입출고 흐름, 그리고 오제작·누락분 현황을 함께 보는 대표 보고 화면입니다.</p>
            </div>
            <div class="rounded-3xl border border-white bg-white px-5 py-4 text-center shadow-sm">
              <p class="text-[12px] font-bold text-amber-700">총 잔고 톤수</p>
              <p class="mt-1 text-4xl font-extrabold text-slate-900">{{ summaryCards[3].value }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div v-for="card in summaryCards" :key="card.label" class="rounded-2xl border p-4" :class="card.tone">
              <p class="text-[13px] font-bold">{{ card.label }}</p>
              <p class="mt-2 text-2xl font-extrabold">{{ card.value }}</p>
              <p class="mt-1 text-[11px] font-semibold opacity-80">{{ card.note }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="grid gap-4 xl:grid-cols-2">
            <article class="rounded-2xl border border-slate-200 bg-white p-5">
              <p class="text-[13px] font-extrabold text-slate-900">재고 요약</p>
              <div class="mt-4 grid gap-3 sm:grid-cols-3">
                <div v-for="item in inventoryHighlights" :key="item.label" class="rounded-2xl border p-4" :class="item.tone">
                  <p class="text-[12px] font-bold text-slate-500">{{ item.label }}</p>
                  <p class="mt-2 text-xl font-extrabold">{{ item.value }}</p>
                </div>
              </div>
            </article>

            <article class="rounded-2xl border border-slate-200 bg-white p-5">
              <p class="text-[13px] font-extrabold text-slate-900">공무부 요약</p>
              <ul class="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                <li>{{ reportMonthLabel }} 총 입고 대비 사용량은 80% 수준으로 잔고는 안정권 유지</li>
                <li>특수 규격 재고는 충분하지만 메인관 사용 비중이 높아 다음 발주 시점 검토 필요</li>
                <li>오제작 3건, 누락 4건으로 현장 클레임 연결 가능 품목은 즉시 대응 우선</li>
              </ul>
            </article>
          </div>
        </section>
      </div>

      <div v-show="currentPage === 2" class="space-y-6">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[13px] font-extrabold text-slate-900">오제작 목록</p>
              <p class="mt-1 text-[12px] text-slate-500">현장별 확인 필요 항목</p>
            </div>
            <span class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">{{ misproductionRows.length }}건</span>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr class="bg-slate-50 text-slate-600">
                  <th class="border border-slate-200 px-3 py-2 text-center">접수일</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">구역</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">내용</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in misproductionRows" :key="`${row.reportedAt}-${row.place}`" class="bg-white">
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.reportedAt }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.area }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.detail }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[13px] font-extrabold text-slate-900">누락분 목록</p>
              <p class="mt-1 text-[12px] text-slate-500">현장별 보완 출고 필요 항목</p>
            </div>
            <span class="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700">{{ shortageRows.length }}건</span>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr class="bg-slate-50 text-slate-600">
                  <th class="border border-slate-200 px-3 py-2 text-center">접수일</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">회사</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">현장</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">구역</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">내용</th>
                  <th class="border border-slate-200 px-3 py-2 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in shortageRows" :key="`${row.reportedAt}-${row.place}`" class="bg-white">
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.reportedAt }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.company }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.place }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.area }}</td>
                  <td class="border border-slate-200 px-3 py-2 text-center">{{ row.detail }}</td>
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

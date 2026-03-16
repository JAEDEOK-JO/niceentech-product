<script setup>
import { computed, ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'

const props = defineProps({
  userName: { type: String, default: '' },
  department: { type: String, default: '' },
  canViewExecutive: { type: Boolean, default: false },
})

const emit = defineEmits(['go-home', 'go-register'])

const documentTabs = [
  { key: 'draft', label: '기안서' },
  { key: 'work', label: '작업보고서' },
  { key: 'proposal', label: '품의서' },
  { key: 'report', label: '일반보고서' },
]

const activeTab = ref(documentTabs[0].key)

const documents = [
  {
    id: 1,
    type: 'draft',
    title: '3월 자재 발주 기안',
    summary: '다음 주 생산분 대응을 위한 긴급 자재 발주 기안입니다.',
    date: '2026-03-13',
    author: '관리자',
    department: '관리팀',
    visibility: 'approval',
    recipients: ['대표'],
    departments: ['관리팀'],
  },
  {
    id: 2,
    type: 'work',
    title: '동탄 현장 금일 작업보고',
    summary: '메인관 제작 완료, 용접 진행 중이며 도면 변경 이슈가 있습니다.',
    date: '2026-03-13',
    author: '홍길동',
    department: '생산부',
    visibility: 'shared',
    recipients: [],
    departments: [],
  },
  {
    id: 3,
    type: 'proposal',
    title: '외주 투입 추가 품의',
    summary: '납기 대응을 위해 외주 인력 추가 투입 승인을 요청합니다.',
    date: '2026-03-12',
    author: '김설계',
    department: '설계부',
    visibility: 'approval',
    recipients: ['대표', '생산부장'],
    departments: ['설계부'],
  },
  {
    id: 4,
    type: 'report',
    title: '주간 생산 실적 보고',
    summary: '주간 생산 목표 대비 실적 및 지연 원인을 정리한 보고입니다.',
    date: '2026-03-12',
    author: '이생산',
    department: '생산부',
    visibility: 'shared',
    recipients: [],
    departments: [],
  },
  {
    id: 5,
    type: 'report',
    title: '대표 보고용 경영 요약',
    summary: '현장별 매출, 납기 리스크, 자금 집행 이슈를 정리했습니다.',
    date: '2026-03-11',
    author: '관리자',
    department: '관리팀',
    visibility: 'executive',
    recipients: ['대표'],
    departments: ['관리팀'],
  },
  {
    id: 6,
    type: 'draft',
    title: '공정 개선안 기안',
    summary: '작업 동선 개선과 장비 배치 변경에 대한 내부 기안입니다.',
    date: '2026-03-10',
    author: '박운영',
    department: '생산부',
    visibility: 'department',
    recipients: [],
    departments: ['생산부'],
  },
  {
    id: 7,
    type: 'proposal',
    title: '대표 승인 필요 비용 품의',
    summary: '설비 수리비 집행 관련 대표 승인 요청 문서입니다.',
    date: '2026-03-09',
    author: '관리자',
    department: '관리팀',
    visibility: 'executive',
    recipients: ['대표'],
    departments: ['관리팀'],
  },
  {
    id: 8,
    type: 'work',
    title: '도면 수정 반영 작업보고',
    summary: '설계 변경본 기준으로 생산 일정 재조정 내용을 공유합니다.',
    date: '2026-03-08',
    author: '김설계',
    department: '설계부',
    visibility: 'department',
    recipients: [],
    departments: ['설계부'],
  },
]

const currentUserName = computed(() => String(props.userName ?? '').trim())
const currentDepartment = computed(() => String(props.department ?? '').trim())

const visibilityMeta = {
  shared: { label: '전체공유', class: 'bg-blue-100 text-blue-700' },
  department: { label: '부서공유', class: 'bg-emerald-100 text-emerald-700' },
  approval: { label: '결재선만', class: 'bg-amber-100 text-amber-700' },
  executive: { label: '대표전용', class: 'bg-rose-100 text-rose-700' },
}

const canViewDocument = (document) => {
  if (document.visibility === 'shared') return true
  if (document.visibility === 'department') return document.departments.includes(currentDepartment.value)
  if (document.visibility === 'approval') {
    return (
      document.author === currentUserName.value ||
      document.recipients.includes(currentUserName.value) ||
      document.recipients.includes(currentDepartment.value) ||
      document.departments.includes(currentDepartment.value)
    )
  }
  if (document.visibility === 'executive') return props.canViewExecutive
  return false
}

const visibleDocuments = computed(() =>
  documents
    .filter((document) => canViewDocument(document))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
)

const tabDocuments = computed(() => visibleDocuments.value.filter((document) => document.type === activeTab.value))
const tabCountMap = computed(() =>
  Object.fromEntries(documentTabs.map((tab) => [tab.key, visibleDocuments.value.filter((document) => document.type === tab.key).length])),
)
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <h1 class="text-xl font-extrabold text-slate-900 md:text-2xl">전자결재</h1>
        <div class="flex shrink-0 items-center gap-2">
          <Button class="h-10 px-4 text-sm" variant="outline" @click="emit('go-home')">홈으로</Button>
          <Button class="h-10 px-4 text-sm" @click="emit('go-register', activeTab)">문서 작성</Button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tab in documentTabs"
            :key="tab.key"
            type="button"
            class="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition"
            :class="
              activeTab === tab.key
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            "
            @click="activeTab = tab.key"
          >
            <span>{{ tab.label }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-bold"
              :class="activeTab === tab.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'"
            >
              {{ tabCountMap[tab.key] ?? 0 }}
            </span>
          </button>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-lg font-extrabold text-slate-900">
              {{ documentTabs.find((tab) => tab.key === activeTab)?.label }}
            </p>
            <p class="mt-1 text-sm text-slate-500">최신 날짜순으로, 현재 계정이 열람 가능한 문서만 표시합니다.</p>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            총 {{ tabDocuments.length }}건
          </span>
        </div>

        <div v-if="tabDocuments.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
          열람 가능한 문서가 없습니다.
        </div>

        <div v-else class="mt-6 space-y-3">
          <article
            v-for="document in tabDocuments"
            :key="document.id"
            class="rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:bg-slate-50"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-base font-extrabold text-slate-900">{{ document.title }}</p>
                  <span class="rounded-full px-3 py-1 text-xs font-bold" :class="visibilityMeta[document.visibility].class">
                    {{ visibilityMeta[document.visibility].label }}
                  </span>
                </div>
                <p class="mt-2 text-sm leading-6 text-slate-600">{{ document.summary }}</p>
              </div>

              <div class="shrink-0 text-right text-xs font-semibold text-slate-500">
                <p>{{ document.date }}</p>
                <p class="mt-1">{{ document.author }} / {{ document.department }}</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  </section>
</template>

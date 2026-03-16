<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'

const props = defineProps({
  authorName: { type: String, default: '' },
  authorDepartment: { type: String, default: '' },
  initialType: { type: String, default: 'work' },
  canViewExecutive: { type: Boolean, default: false },
})

const emit = defineEmits(['go-list'])

const today = new Date()
const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const documentTypes = [
  {
    key: 'draft',
    label: '기안서',
    shortLabel: '기안',
    description: '내부 승인이나 검토가 필요한 안건을 상신하는 기본 기안 문서',
    summaryTitle: '기안 요약',
    detailTitle: '기안 상세 내용',
    requestTitle: '승인 요청 사항',
  },
  {
    key: 'work',
    label: '작업보고서',
    shortLabel: '작업보고',
    description: '현장 작업 결과와 진행상황을 팀에 보고하는 문서',
    summaryTitle: '작업 요약',
    detailTitle: '세부 작업 내용',
    requestTitle: '이슈 및 요청사항',
  },
  {
    key: 'proposal',
    label: '품의서',
    shortLabel: '품의',
    description: '비용, 구매, 일정, 인력 등에 대한 승인 요청 문서',
    summaryTitle: '품의 사유',
    detailTitle: '세부 검토 내용',
    requestTitle: '결재 요청 내용',
  },
  {
    key: 'report',
    label: '일반보고서',
    shortLabel: '일반보고',
    description: '부서 보고, 대표 보고, 정기 보고에 사용하는 범용 문서',
    summaryTitle: '보고 핵심 요약',
    detailTitle: '상세 보고 내용',
    requestTitle: '후속 조치 및 공유사항',
  },
]

const accessScopes = computed(() => {
  const scopes = [
    {
      key: 'shared',
      label: '전체공유',
      description: '로그인 사용자 전체가 열람 가능한 문서',
      badge: 'bg-blue-100 text-blue-700',
    },
    {
      key: 'approval-line',
      label: '결재선만',
      description: '작성자, 수신자, 참조자, 결재선만 열람 가능한 문서',
      badge: 'bg-amber-100 text-amber-700',
    },
    {
      key: 'selected',
      label: '지정자공개',
      description: '직접 지정한 대상만 열람 가능한 문서',
      badge: 'bg-violet-100 text-violet-700',
    },
  ]

  if (props.canViewExecutive) {
    scopes.push({
      key: 'executive',
      label: '대표전용',
      description: '대표 또는 관리자만 열람 가능한 민감 문서',
      badge: 'bg-rose-100 text-rose-700',
    })
  }

  return scopes
})

const selectedType = ref(documentTypes.some((item) => item.key === props.initialType) ? props.initialType : 'work')
const form = reactive({
  title: '',
  reportDate: defaultDate,
  recipient: '',
  reference: '',
  urgency: '보통',
  accessScope: 'shared',
  approvalLine: '',
  allowedReaders: '',
  summary: '',
  detail: '',
  request: '',
})

watch(
  accessScopes,
  (scopes) => {
    const exists = scopes.some((item) => item.key === form.accessScope)
    if (!exists) form.accessScope = scopes[0]?.key ?? 'shared'
  },
  { immediate: true },
)

const currentType = computed(() => documentTypes.find((item) => item.key === selectedType.value) ?? documentTypes[0])
const currentAccess = computed(() => accessScopes.value.find((item) => item.key === form.accessScope) ?? accessScopes.value[0])
const authorLabel = computed(() => {
  const name = String(props.authorName ?? '').trim() || '작성자'
  const department = String(props.authorDepartment ?? '').trim()
  return department ? `${name} / ${department}` : name
})
const previewTitle = computed(() => String(form.title ?? '').trim() || `${currentType.value.label} 제목`)
</script>

<template>
  <section class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-4 md:px-6">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Electronic Approval</p>
          <h1 class="mt-1 text-xl font-extrabold text-slate-900 md:text-2xl">전자결재 작성</h1>
          <p class="mt-2 text-sm text-slate-600">문서 종류와 공개 범위를 먼저 정한 뒤 수신자, 결재선, 내용을 입력하는 구조로 구성했습니다.</p>
        </div>
        <Button class="shrink-0" variant="outline" @click="emit('go-list')">전자결재 메인</Button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-8">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div class="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div>
            <p class="text-sm font-extrabold text-slate-900">문서 종류</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="item in documentTypes"
                :key="item.key"
                type="button"
                class="rounded-2xl border px-4 py-2 text-sm font-bold transition"
                :class="
                  selectedType === item.key
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                "
                @click="selectedType = item.key"
              >
                {{ item.label }}
              </button>
            </div>
            <p class="mt-3 text-sm leading-6 text-slate-600">{{ currentType.description }}</p>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-extrabold text-slate-900">권한 설계 기준</p>
            <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>공지성 보고는 `전체공유`가 적합합니다.</li>
              <li>품의서, 민감 보고는 `결재선만` 또는 `지정자공개`가 안전합니다.</li>
              <li>대표 보고는 대표 전용 문서함으로 분리하는 구성이 좋습니다.</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div class="grid gap-5 md:grid-cols-2">
            <div class="md:col-span-2">
              <p class="mb-2 text-sm font-bold text-slate-700">문서 제목</p>
              <Input
                :model-value="form.title"
                :placeholder="`${currentType.label} 제목 입력`"
                @update:model-value="form.title = $event"
              />
            </div>

            <div>
              <p class="mb-2 text-sm font-bold text-slate-700">보고일</p>
              <input
                v-model="form.reportDate"
                type="date"
                class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <p class="mb-2 text-sm font-bold text-slate-700">중요도</p>
              <select
                v-model="form.urgency"
                class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <option value="낮음">낮음</option>
                <option value="보통">보통</option>
                <option value="높음">높음</option>
                <option value="긴급">긴급</option>
              </select>
            </div>

            <div>
              <p class="mb-2 text-sm font-bold text-slate-700">수신</p>
              <Input
                :model-value="form.recipient"
                placeholder="예: 대표이사, 생산부장"
                @update:model-value="form.recipient = $event"
              />
            </div>

            <div>
              <p class="mb-2 text-sm font-bold text-slate-700">참조</p>
              <Input
                :model-value="form.reference"
                placeholder="예: 설계팀, 관리팀"
                @update:model-value="form.reference = $event"
              />
            </div>

            <div class="md:col-span-2">
              <p class="mb-2 text-sm font-bold text-slate-700">공개 범위</p>
              <div class="grid gap-3 md:grid-cols-2">
                <button
                  v-for="scope in accessScopes"
                  :key="scope.key"
                  type="button"
                  class="rounded-2xl border px-4 py-4 text-left transition"
                  :class="
                    form.accessScope === scope.key
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  "
                  @click="form.accessScope = scope.key"
                >
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-extrabold">{{ scope.label }}</p>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-bold"
                      :class="form.accessScope === scope.key ? 'bg-white/15 text-white' : scope.badge"
                    >
                      권한
                    </span>
                  </div>
                  <p class="mt-2 text-sm leading-6" :class="form.accessScope === scope.key ? 'text-white/85' : 'text-slate-600'">
                    {{ scope.description }}
                  </p>
                </button>
              </div>
            </div>

            <div class="md:col-span-2">
              <p class="mb-2 text-sm font-bold text-slate-700">결재선</p>
              <Input
                :model-value="form.approvalLine"
                placeholder="예: 팀장 > 부서장 > 대표"
                @update:model-value="form.approvalLine = $event"
              />
            </div>

            <div v-if="form.accessScope === 'selected'" class="md:col-span-2">
              <p class="mb-2 text-sm font-bold text-slate-700">지정 공개 대상</p>
              <Input
                :model-value="form.allowedReaders"
                placeholder="예: 홍길동, 생산부장, 설계팀"
                @update:model-value="form.allowedReaders = $event"
              />
            </div>

            <div class="md:col-span-2">
              <p class="mb-2 text-sm font-bold text-slate-700">{{ currentType.summaryTitle }}</p>
              <textarea
                v-model="form.summary"
                rows="4"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                placeholder="핵심 내용만 간단히 정리해주세요."
              />
            </div>

            <div class="md:col-span-2">
              <p class="mb-2 text-sm font-bold text-slate-700">{{ currentType.detailTitle }}</p>
              <textarea
                v-model="form.detail"
                rows="8"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                placeholder="상세 내용을 자유롭게 작성해주세요."
              />
            </div>

            <div class="md:col-span-2">
              <p class="mb-2 text-sm font-bold text-slate-700">{{ currentType.requestTitle }}</p>
              <textarea
                v-model="form.request"
                rows="4"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                placeholder="승인 요청, 후속 조치, 공유 사항 등을 입력해주세요."
              />
            </div>
          </div>
        </article>

        <aside class="space-y-5">
          <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-extrabold text-slate-900">문서 미리보기</p>
              <span class="rounded-full px-3 py-1 text-xs font-bold" :class="currentAccess.badge">{{ currentType.shortLabel }}</span>
            </div>

            <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-lg font-extrabold text-slate-900">{{ previewTitle }}</p>
              <div class="mt-3 space-y-2 text-sm text-slate-600">
                <p><span class="font-bold text-slate-800">작성자</span> {{ authorLabel }}</p>
                <p><span class="font-bold text-slate-800">보고일</span> {{ form.reportDate || '-' }}</p>
                <p><span class="font-bold text-slate-800">수신</span> {{ form.recipient || '-' }}</p>
                <p><span class="font-bold text-slate-800">참조</span> {{ form.reference || '-' }}</p>
                <p><span class="font-bold text-slate-800">결재선</span> {{ form.approvalLine || '-' }}</p>
                <p><span class="font-bold text-slate-800">공개 범위</span> {{ currentAccess.label }}</p>
                <p v-if="form.accessScope === 'selected'"><span class="font-bold text-slate-800">지정 공개 대상</span> {{ form.allowedReaders || '-' }}</p>
              </div>
            </div>

            <div class="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              <div class="rounded-2xl bg-slate-50 px-4 py-3">
                <p class="font-bold text-slate-900">{{ currentType.summaryTitle }}</p>
                <p class="mt-2 whitespace-pre-wrap">{{ form.summary || '요약 내용이 여기에 표시됩니다.' }}</p>
              </div>
              <div class="rounded-2xl bg-slate-50 px-4 py-3">
                <p class="font-bold text-slate-900">{{ currentType.detailTitle }}</p>
                <p class="mt-2 whitespace-pre-wrap">{{ form.detail || '상세 내용이 여기에 표시됩니다.' }}</p>
              </div>
              <div class="rounded-2xl bg-slate-50 px-4 py-3">
                <p class="font-bold text-slate-900">{{ currentType.requestTitle }}</p>
                <p class="mt-2 whitespace-pre-wrap">{{ form.request || '요청 및 공유 사항이 여기에 표시됩니다.' }}</p>
              </div>
            </div>
          </article>
        </aside>
      </section>
    </main>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'

defineProps({
  pageTitle: { type: String, default: '생산계획 등록' },
  submitLabel: { type: String, default: '등록' },
  targetDateLabel: { type: String, required: true },
  companySearchText: { type: String, default: '' },
  companySearchLoading: { type: Boolean, default: false },
  companyDialogOpen: { type: Boolean, default: false },
  companySearchResults: { type: Array, default: () => [] },
  canRegisterCompany: { type: Boolean, default: false },
  managerDialogOpen: { type: Boolean, default: false },
  managerOptions: { type: Array, default: () => [] },
  loadingManagers: { type: Boolean, default: false },
  selectedManagerId: { type: String, default: '' },
  form: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  saveError: { type: String, default: '' },
})

const calendarWeekLabels = ['일', '월', '화', '수', '목', '금', '토']
const isCalendarDialogOpen = ref(false)
const localCalendarValue = ref('')
const localCalendarMonth = ref(new Date())

const emit = defineEmits([
  'go-back',
  'go-company-register',
  'company-search-text-change',
  'company-search-enter',
  'select-company',
  'close-company-dialog',
  'close-manager-dialog',
  'update-form',
  'numeric-keydown',
  'weight-keydown',
  'select-manager',
  'confirm-manager',
  'submit',
])

const parseIsoDate = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!matched) return null
  const [, y, m, d] = matched
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

const formatIsoDate = (date) => {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatDisplayDate = (value) => {
  const parsed = parseIsoDate(value)
  if (!parsed) return ''
  return `${parsed.getFullYear()}년 ${String(parsed.getMonth() + 1).padStart(2, '0')}월 ${String(parsed.getDate()).padStart(2, '0')}일`
}

const syncCalendarMonth = (value) => {
  const parsed = parseIsoDate(value)
  const base = parsed ?? new Date()
  localCalendarMonth.value = new Date(base.getFullYear(), base.getMonth(), 1)
}

const calendarMonthLabel = computed(() => {
  const base = localCalendarMonth.value
  return `${base.getFullYear()}년 ${String(base.getMonth() + 1).padStart(2, '0')}월`
})

const calendarWeeks = computed(() => {
  const monthStart = new Date(localCalendarMonth.value.getFullYear(), localCalendarMonth.value.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex)
      date.setHours(0, 0, 0, 0)
      return {
        key: formatIsoDate(date),
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === localCalendarMonth.value.getMonth(),
        isSelected: formatIsoDate(date) === String(localCalendarValue.value ?? ''),
      }
    }),
  )
})

const openCalendarDialog = (value) => {
  localCalendarValue.value = String(value ?? '')
  syncCalendarMonth(localCalendarValue.value)
  isCalendarDialogOpen.value = true
}

const closeCalendarDialog = () => {
  isCalendarDialogOpen.value = false
}

const moveCalendarMonth = (delta) => {
  const base = localCalendarMonth.value
  localCalendarMonth.value = new Date(base.getFullYear(), base.getMonth() + delta, 1)
}

const selectCalendarDate = (day) => {
  localCalendarValue.value = day.key
  emit('update-form', 'deliveryDueDate', day.key)
  closeCalendarDialog()
}
</script>

<template>
  <section class="min-h-screen bg-white">
    <header class="border-b border-slate-200 bg-white">
      <div class="flex items-center justify-between px-4 py-4 md:px-6">
        <div>
        
          <h1 class="text-lg font-extrabold text-slate-900 md:text-xl">{{ pageTitle }}</h1>
        </div>
        <Button class="h-9 px-4 text-sm" variant="outline" @click="emit('go-back')">목록으로</Button>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="grid gap-5 md:grid-cols-2">
          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">검수일자</p>
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">
              {{ targetDateLabel }}
            </div>
          </div>

          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">도착일</p>
            <button
              type="button"
              class="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-left text-slate-900 transition hover:bg-slate-50"
              @click="openCalendarDialog(form.deliveryDueDate)"
            >
              <span :class="form.deliveryDueDate ? 'text-slate-900' : 'text-slate-400'">
                {{ formatDisplayDate(form.deliveryDueDate) || '도착일 선택' }}
              </span>
              <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 fill-none stroke-current text-slate-500" stroke-width="2">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </button>
          </div>

          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">회사명 검색</p>
            <div class="flex flex-col gap-2 sm:flex-row">
              <Input
                class="flex-1"
                :model-value="companySearchText"
                placeholder="회사명 검색어를 입력하고 엔터"
                @update:model-value="emit('company-search-text-change', $event)"
                @keydown.enter="emit('company-search-enter')"
              />
              <Button
                v-if="canRegisterCompany"
                class="h-11 shrink-0 px-4 text-sm"
                variant="outline"
                @click="emit('go-company-register')"
              >
                회사등록
              </Button>
            </div>
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">회사명</p>
            <Input :model-value="form.company" readonly placeholder="검색 후 선택" />
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">현장명</p>
            <Input :model-value="form.place" readonly placeholder="검색 후 선택" />
          </div>

          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">담당자</p>
            <Input :model-value="form.name" readonly placeholder="담당자 미지정" />
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">구역명</p>
            <Input :model-value="form.area" placeholder="구역명 입력" @update:model-value="emit('update-form', 'area', $event)" />
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">이니셜</p>
            <Input :model-value="form.initial" placeholder="이니셜 입력" @update:model-value="emit('update-form', 'initial', $event)" />
          </div>

          <div class="md:col-span-2">
            <div class="grid gap-5 md:grid-cols-4">
              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">헤드</p>
                <Input
                  :model-value="form.head"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="숫자만 입력"
                  @keydown="emit('numeric-keydown', $event)"
                  @update:model-value="emit('update-form', 'head', $event)"
                />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">홀</p>
                <Input
                  :model-value="form.hole"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="숫자만 입력"
                  @keydown="emit('numeric-keydown', $event)"
                  @update:model-value="emit('update-form', 'hole', $event)"
                />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">그루브</p>
                <Input
                  :model-value="form.groove"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="숫자만 입력"
                  @keydown="emit('numeric-keydown', $event)"
                  @update:model-value="emit('update-form', 'groove', $event)"
                />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">중량</p>
                <Input
                  :model-value="form.weight"
                  inputmode="decimal"
                  placeholder="소수점 1자리"
                  @keydown="emit('weight-keydown', $event)"
                  @update:model-value="emit('update-form', 'weight', $event)"
                />
              </div>
            </div>
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">작업유형</p>
            <select
              class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              :value="form.workType"
              @change="emit('update-form', 'workType', $event.target.value)"
            >
              <option value="용접/무용접">용접/무용접</option>
              <option value="전실/입상">전실/입상</option>
              <option value="나사">나사</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div>
            <p class="mb-2 text-sm font-bold text-slate-700">검수 여부</p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-bold"
                :class="form.isTest ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700'"
                @click="emit('update-form', 'isTest', true)"
              >
                검수
              </button>
              <button
                type="button"
                class="rounded-xl px-4 py-2 text-sm font-bold"
                :class="!form.isTest ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'"
                @click="emit('update-form', 'isTest', false)"
              >
                비검수
              </button>
            </div>
          </div>

          <div class="md:col-span-2">
            <p class="mb-2 text-sm font-bold text-slate-700">비고</p>
            <textarea
              class="min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              rows="3"
              :value="form.memo"
              placeholder="비고 입력"
              @input="emit('update-form', 'memo', $event.target.value)"
            />
          </div>
        </div>

        <p v-if="saveError" class="mt-4 text-sm font-bold text-red-600">{{ saveError }}</p>

        <div class="mt-6 flex justify-end gap-2">
          <Button class="h-10 px-5 text-sm" variant="outline" @click="emit('go-back')">취소</Button>
          <Button class="h-10 px-5 text-sm" :disabled="saving" @click="emit('submit')">
            {{ saving ? '저장 중...' : submitLabel }}
          </Button>
        </div>
      </div>
    </main>

    <div
      v-if="companyDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="emit('close-company-dialog')"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-extrabold text-slate-900">회사 선택</h2>
            <p class="mt-1 text-sm text-slate-500">검색 결과에서 회사명/현장명을 선택해주세요.</p>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="emit('close-company-dialog')">닫기</button>
        </div>

        <div class="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
          <div v-if="companySearchLoading" class="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            검색 중...
          </div>
          <div v-else-if="companySearchResults.length === 0" class="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            검색 결과가 없습니다.
          </div>
          <button
            v-for="item in companySearchResults"
            :key="item.id"
            type="button"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-slate-300 hover:bg-slate-50"
            @click="emit('select-company', item)"
          >
            <p class="text-sm font-extrabold text-slate-900">{{ item.company || '-' }}</p>
            <p class="mt-1 text-sm text-slate-600">{{ item.place || '-' }}</p>
            <p class="mt-1 text-xs font-bold text-slate-700">담당자 {{ item.managerName || '-' }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ item.fullName || '-' }}</p>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isCalendarDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="closeCalendarDialog"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
              <h2 class="text-base font-extrabold text-slate-900">도착일 선택</h2>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="closeCalendarDialog">닫기</button>
        </div>

        <div class="mt-4">
          <div class="mb-3 flex items-center justify-between">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              @click="moveCalendarMonth(-1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <p class="text-sm font-extrabold text-slate-900">{{ calendarMonthLabel }}</p>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              @click="moveCalendarMonth(1)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-7 gap-1">
            <div
              v-for="label in calendarWeekLabels"
              :key="label"
              class="flex h-8 items-center justify-center text-xs font-bold text-slate-500"
            >
              {{ label }}
            </div>
            <button
              v-for="day in calendarWeeks.flat()"
              :key="day.key"
              type="button"
              class="flex h-11 items-center justify-center rounded-lg border text-sm transition"
              :class="[
                day.isSelected
                  ? 'border-slate-900 bg-slate-900 font-extrabold text-white'
                  : day.isCurrentMonth
                    ? 'border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50'
                    : 'border-slate-100 bg-slate-50 text-slate-300',
              ]"
              @click="selectCalendarDate(day)"
            >
              {{ day.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="managerDialogOpen"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="emit('close-manager-dialog')"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-extrabold text-slate-900">담당자 선택</h2>
            <p class="mt-1 text-sm text-slate-500">담당자가 미지정된 현장입니다. 설계부 담당자를 먼저 지정해주세요.</p>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="emit('close-manager-dialog')">닫기</button>
        </div>

        <div class="mt-4">
          <select
            class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :value="selectedManagerId"
            @change="emit('select-manager', $event.target.value)"
          >
            <option value="">담당자를 선택해주세요</option>
            <option v-for="item in managerOptions" :key="item.id" :value="item.id">
              {{ item.name || '이름없음' }}{{ item.department ? ` (${item.department})` : '' }}
            </option>
          </select>
          <p class="mt-2 text-xs text-slate-500">
            {{ loadingManagers ? '설계부 담당자 목록을 불러오는 중...' : '선택 후 저장하면 현장 담당자가 함께 지정됩니다.' }}
          </p>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <Button class="h-10 px-4 text-sm" variant="outline" @click="emit('close-manager-dialog')">취소</Button>
          <Button class="h-10 px-4 text-sm" :disabled="loadingManagers || !selectedManagerId" @click="emit('confirm-manager')">선택 후 저장</Button>
        </div>
      </div>
    </div>
  </section>
</template>

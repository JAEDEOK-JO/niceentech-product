<script setup>
import { computed, ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { COMPANY_TYPE_OPTIONS } from '@/constants/companyTypes'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  managers: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  loadingManagers: { type: Boolean, default: false },
  saveError: { type: String, default: '' },
  searchText: { type: String, default: '' },
  showExpectedOnly: { type: Boolean, default: false },
  totalCount: { type: Number, default: 0 },
  savingIds: { type: Array, default: () => [] },
})

const emit = defineEmits(['go-back', 'refresh', 'update-search', 'toggle-expected-only', 'update-row', 'save-row'])

const isSaving = (rowId) => props.savingIds.includes(rowId)

const INITIAL_CONSONANTS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
const CONSONANT_GROUP_MAP = { ㄲ: 'ㄱ', ㄸ: 'ㄷ', ㅃ: 'ㅂ', ㅆ: 'ㅅ', ㅉ: 'ㅈ' }
const CONSONANT_ORDER = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ','기타']

const getInitialConsonant = (text) => {
  const ch = String(text ?? '').trim().charAt(0)
  if (!ch) return '기타'
  const code = ch.charCodeAt(0)
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const idx = Math.floor((code - 0xAC00) / 588)
    const consonant = INITIAL_CONSONANTS[idx] || '기타'
    return CONSONANT_GROUP_MAP[consonant] || consonant
  }
  if (/[ㄱ-ㅎ]/.test(ch)) return CONSONANT_GROUP_MAP[ch] || ch
  return '기타'
}

const selectedRowId = ref(null)
const collapsedConsonants = ref(new Set())
const listCollapsed = ref(false)

const selectRow = (rowId) => {
  selectedRowId.value = rowId
  listCollapsed.value = true
}

const selectedRow = computed(() => {
  if (!selectedRowId.value) return null
  return props.rows.find((r) => r.id === selectedRowId.value) ?? null
})

const toggleConsonant = (consonant) => {
  const next = new Set(collapsedConsonants.value)
  if (next.has(consonant)) {
    next.delete(consonant)
  } else {
    next.add(consonant)
  }
  collapsedConsonants.value = next
}

const groupedByConsonant = computed(() => {
  const map = {}
  for (const row of props.rows) {
    const company = String(row.company ?? '').trim()
    const consonant = getInitialConsonant(company)
    if (!map[consonant]) map[consonant] = {}
    if (!map[consonant][company]) map[consonant][company] = []
    map[consonant][company].push(row)
  }

  return CONSONANT_ORDER
    .filter((c) => map[c])
    .map((consonant) => {
      const companies = Object.entries(map[consonant])
        .sort(([a], [b]) => a.localeCompare(b, 'ko'))
        .map(([company, places]) => ({
          company,
          places: places.sort((a, b) => String(a.place).localeCompare(String(b.place), 'ko')),
        }))
      return { consonant, companies }
    })
})
</script>

<template>
  <section class="min-h-screen bg-white">
    <main class="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-extrabold text-slate-900 md:text-2xl">회사리스트</h1>
          <p class="mt-1 text-sm text-slate-500">등록된 회사와 현장 정보를 확인하고 바로 수정 저장할 수 있습니다.</p>
        </div>
        <div class="flex gap-2">
          <Button class="h-9 px-4 text-sm" variant="outline" @click="emit('refresh')">새로고침</Button>
          <Button class="h-9 px-4 text-sm" variant="outline" @click="emit('go-back')">돌아가기</Button>
        </div>
      </div>

      <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="flex flex-1 gap-2">
            <Input
              :model-value="searchText"
              placeholder="회사명 현장명 검색 예: 등 미"
              @update:model-value="emit('update-search', $event)"
            />
            <Button
              class="h-11 shrink-0 px-4 text-sm"
              :variant="showExpectedOnly ? 'default' : 'outline'"
              @click="emit('toggle-expected-only')"
            >
              수주예정
            </Button>
          </div>
          <div class="text-sm font-semibold text-slate-500">총 {{ totalCount }}건</div>
        </div>

        <p v-if="saveError" class="mt-4 text-sm font-bold text-red-600">{{ saveError }}</p>

        <div v-if="loading" class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
          회사 목록을 불러오는 중입니다.
        </div>

        <div v-else-if="rows.length === 0" class="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
          표시할 회사 데이터가 없습니다.
        </div>

        <div v-else class="mt-6 grid grid-cols-1 gap-0 md:gap-0" :class="listCollapsed ? 'md:grid-cols-[40px_1fr]' : 'md:grid-cols-[3fr_7fr]'">
          <div v-if="listCollapsed" class="flex flex-col items-center border-r border-slate-200 pt-2 md:h-[calc(100vh-220px)]">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              @click="listCollapsed = false"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="2"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
          <div v-else class="overflow-y-auto border-r border-slate-200 md:h-[calc(100vh-220px)]">
            <div class="sticky top-0 z-20 flex items-center justify-between bg-white px-3 py-1.5 border-b border-slate-200">
              <span class="text-xs font-bold text-slate-500">목록</span>
              <button
                v-if="selectedRowId"
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                @click="listCollapsed = true"
              >
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-none stroke-current" stroke-width="2"><path d="m15 18-6-6 6-6" /></svg>
              </button>
            </div>
            <div v-for="group in groupedByConsonant" :key="group.consonant">
              <button
                type="button"
                class="sticky top-0 z-10 flex h-9 w-full items-center justify-between bg-slate-900 px-4"
                @click="toggleConsonant(group.consonant)"
              >
                <span class="text-sm font-extrabold text-white">{{ group.consonant }}</span>
                <svg
                  viewBox="0 0 24 24"
                  class="h-4 w-4 fill-none stroke-white transition-transform"
                  :class="collapsedConsonants.has(group.consonant) ? '-rotate-90' : ''"
                  stroke-width="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <div v-if="!collapsedConsonants.has(group.consonant)" class="space-y-0">
                <div v-for="entry in group.companies" :key="entry.company">
                  <p class="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-extrabold text-slate-500">{{ entry.company }}</p>
                  <button
                    v-for="row in entry.places"
                    :key="row.id"
                    type="button"
                    class="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2 text-left text-sm transition hover:bg-blue-50"
                    :class="selectedRowId === row.id ? 'bg-blue-50 font-bold text-blue-800' : 'text-slate-700'"
                    @click="selectRow(row.id)"
                  >
                    <span class="truncate pr-2">{{ row.place || '-' }}</span>
                    <span class="shrink-0 text-[10px] text-slate-400">{{ row.totalHeadCount ? `${Number(row.totalHeadCount).toLocaleString()}` : '' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-y-auto p-5 md:h-[calc(100vh-220px)]">
            <div v-if="!selectedRow" class="flex h-full items-center justify-center text-sm text-slate-400">
              좌측 목록에서 현장을 선택해주세요
            </div>
            <div v-else class="space-y-5">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-lg font-extrabold text-slate-900">{{ selectedRow.company }} {{ selectedRow.place }}</p>
                  <p class="mt-1 text-xs text-slate-500">ID {{ selectedRow.id }}</p>
                </div>
                <Button class="h-9 px-4 text-sm" :disabled="isSaving(selectedRow.id)" @click="emit('save-row', selectedRow.id)">
                  {{ isSaving(selectedRow.id) ? '저장 중...' : '저장' }}
                </Button>
              </div>

              <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">회사명</p>
                  <Input :model-value="selectedRow.company" @update:model-value="emit('update-row', selectedRow.id, 'company', $event)" />
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">현장명</p>
                  <Input :model-value="selectedRow.place" @update:model-value="emit('update-row', selectedRow.id, 'place', $event)" />
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">총헤드수</p>
                  <Input :model-value="selectedRow.totalHeadCount" inputmode="numeric" @update:model-value="emit('update-row', selectedRow.id, 'totalHeadCount', $event)" />
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">건물종류</p>
                  <select
                    class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    :value="selectedRow.companyType"
                    @change="emit('update-row', selectedRow.id, 'companyType', $event.target.value)"
                  >
                    <option value="">선택안함</option>
                    <option v-for="item in COMPANY_TYPE_OPTIONS" :key="item" :value="item">{{ item }}</option>
                  </select>
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">수주 상태</p>
                  <label class="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900">
                    <span>{{ selectedRow.orderConfirmed ? '확정수주' : '수주예정' }}</span>
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      :checked="selectedRow.orderConfirmed"
                      @change="emit('update-row', selectedRow.id, 'orderConfirmed', $event.target.checked)"
                    />
                  </label>
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">현장 종료 여부</p>
                  <label class="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900">
                    <span>{{ selectedRow.siteCompleted ? '종료' : '진행중' }}</span>
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      :checked="selectedRow.siteCompleted"
                      @change="emit('update-row', selectedRow.id, 'siteCompleted', $event.target.checked)"
                    />
                  </label>
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">소장 이름</p>
                  <Input :model-value="selectedRow.directorName" @update:model-value="emit('update-row', selectedRow.id, 'directorName', $event)" />
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">소장 전화번호</p>
                  <Input :model-value="selectedRow.directorPhone" @update:model-value="emit('update-row', selectedRow.id, 'directorPhone', $event)" />
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">사업자등록번호</p>
                  <Input :model-value="selectedRow.businessRegistrationNumber" @update:model-value="emit('update-row', selectedRow.id, 'businessRegistrationNumber', $event)" />
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">등록월</p>
                  <input
                    type="month"
                    class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    :value="selectedRow.registrationMonth"
                    @input="emit('update-row', selectedRow.id, 'registrationMonth', $event.target.value)"
                  />
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">착공일</p>
                  <input
                    type="date"
                    class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    :value="selectedRow.startDate"
                    @input="emit('update-row', selectedRow.id, 'startDate', $event.target.value)"
                  />
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">준공일</p>
                  <input
                    type="date"
                    class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    :value="selectedRow.endDate"
                    @input="emit('update-row', selectedRow.id, 'endDate', $event.target.value)"
                  />
                </div>
                <div>
                  <p class="mb-2 text-sm font-bold text-slate-700">담당자</p>
                  <select
                    class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    :value="selectedRow.managerId"
                    @change="emit('update-row', selectedRow.id, 'managerId', $event.target.value)"
                  >
                    <option value="">담당자 미지정</option>
                    <option v-for="item in managers" :key="item.id" :value="item.id">
                      {{ item.name || '이름없음' }}{{ item.department ? ` (${item.department})` : '' }}
                    </option>
                  </select>
                </div>
                <div class="md:col-span-2 xl:col-span-3">
                  <p class="mb-2 text-sm font-bold text-slate-700">현장 주소</p>
                  <textarea
                    class="min-h-[84px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    :value="selectedRow.siteAddress"
                    @input="emit('update-row', selectedRow.id, 'siteAddress', $event.target.value)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </section>
</template>

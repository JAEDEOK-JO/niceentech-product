<script setup>
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'

defineProps({
  targetDateLabel: { type: String, required: true },
  companySearchText: { type: String, default: '' },
  companySearchLoading: { type: Boolean, default: false },
  companyDialogOpen: { type: Boolean, default: false },
  companySearchResults: { type: Array, default: () => [] },
  canRegisterCompany: { type: Boolean, default: false },
  form: { type: Object, required: true },
  saving: { type: Boolean, default: false },
  saveError: { type: String, default: '' },
})

const emit = defineEmits([
  'go-back',
  'go-company-register',
  'company-search-text-change',
  'company-search-enter',
  'select-company',
  'close-company-dialog',
  'update-form',
  'numeric-keydown',
  'weight-keydown',
  'submit',
])
</script>

<template>
  <section class="min-h-screen bg-white">
    <header class="border-b border-slate-200 bg-white">
      <div class="flex items-center justify-between px-4 py-4 md:px-6">
        <div>
        
          <h1 class="text-lg font-extrabold text-slate-900 md:text-xl">생산계획 등록</h1>
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
            {{ saving ? '저장 중...' : '등록' }}
          </Button>
        </div>
      </div>
    </main>

    <div
      v-if="companyDialogOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
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
  </section>
</template>

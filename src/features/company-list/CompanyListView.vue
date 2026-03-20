<script setup>
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

        <div v-else class="mt-6 space-y-4">
          <article
            v-for="row in rows"
            :key="row.id"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div class="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="truncate text-lg font-extrabold text-slate-900">{{ row.fullName || '-' }}</p>
                <p class="mt-1 text-sm text-slate-500">ID {{ row.id }}</p>
              </div>
              <Button
                class="h-10 px-4 text-sm"
                :disabled="isSaving(row.id)"
                @click="emit('save-row', row.id)"
              >
                {{ isSaving(row.id) ? '저장 중...' : '저장' }}
              </Button>
            </div>

            <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">회사명</p>
                <Input :model-value="row.company" @update:model-value="emit('update-row', row.id, 'company', $event)" />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">현장명</p>
                <Input :model-value="row.place" @update:model-value="emit('update-row', row.id, 'place', $event)" />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">총헤드수</p>
                <Input :model-value="row.totalHeadCount" inputmode="numeric" @update:model-value="emit('update-row', row.id, 'totalHeadCount', $event)" />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">건물종류</p>
                <select
                  class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  :value="row.companyType"
                  @change="emit('update-row', row.id, 'companyType', $event.target.value)"
                >
                  <option value="">선택안함</option>
                  <option v-for="item in COMPANY_TYPE_OPTIONS" :key="item" :value="item">{{ item }}</option>
                </select>
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">수주 상태</p>
                <label class="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900">
                  <span>{{ row.orderConfirmed ? '확정수주' : '수주예정' }}</span>
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    :checked="row.orderConfirmed"
                    @change="emit('update-row', row.id, 'orderConfirmed', $event.target.checked)"
                  />
                </label>
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">현장 종료 여부</p>
                <label class="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900">
                  <span>{{ row.siteCompleted ? '종료' : '진행중' }}</span>
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    :checked="row.siteCompleted"
                    @change="emit('update-row', row.id, 'siteCompleted', $event.target.checked)"
                  />
                </label>
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">소장 이름</p>
                <Input :model-value="row.directorName" @update:model-value="emit('update-row', row.id, 'directorName', $event)" />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">소장 전화번호</p>
                <Input :model-value="row.directorPhone" @update:model-value="emit('update-row', row.id, 'directorPhone', $event)" />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">사업자등록번호</p>
                <Input :model-value="row.businessRegistrationNumber" @update:model-value="emit('update-row', row.id, 'businessRegistrationNumber', $event)" />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">등록월</p>
                <input
                  type="month"
                  class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  :value="row.registrationMonth"
                  @input="emit('update-row', row.id, 'registrationMonth', $event.target.value)"
                />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">착공일</p>
                <input
                  type="date"
                  class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  :value="row.startDate"
                  @input="emit('update-row', row.id, 'startDate', $event.target.value)"
                />
              </div>

              <div>
                <p class="mb-2 text-sm font-bold text-slate-700">준공일</p>
                <input
                  type="date"
                  class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  :value="row.endDate"
                  @input="emit('update-row', row.id, 'endDate', $event.target.value)"
                />
              </div>

              <div class="xl:col-span-2">
                <p class="mb-2 text-sm font-bold text-slate-700">담당자</p>
                <select
                  class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  :value="row.managerId"
                  @change="emit('update-row', row.id, 'managerId', $event.target.value)"
                >
                  <option value="">담당자 미지정</option>
                  <option v-for="item in managers" :key="item.id" :value="item.id">
                    {{ item.name || '이름없음' }}{{ item.department ? ` (${item.department})` : '' }}
                  </option>
                </select>
                <p class="mt-2 text-xs text-slate-500">
                  {{ loadingManagers ? '담당자 목록 불러오는 중...' : '설계 담당자를 연결할 수 있습니다.' }}
                </p>
              </div>

              <div class="md:col-span-2 xl:col-span-4">
                <p class="mb-2 text-sm font-bold text-slate-700">현장 주소</p>
                <textarea
                  class="min-h-[84px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  :value="row.siteAddress"
                  @input="emit('update-row', row.id, 'siteAddress', $event.target.value)"
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  </section>
</template>

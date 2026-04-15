<script setup lang="ts">
import { ref, computed } from 'vue'
import type {
  AttendanceRequest,
  AttendanceFilters,
  AttendanceFormState,
  AttendanceAnnualQuota,
  AttendanceDashboardStats,
  Employee,
} from '../types/attendance'
import type { EmployeeFormData } from '../services/attendance.service'
import AttendanceFiltersComp from './AttendanceFilters.vue'
import AttendanceForm from './AttendanceForm.vue'
import AttendanceEmployeeList from './AttendanceEmployeeList.vue'
import AttendanceDetailModal from './AttendanceDetailModal.vue'

const props = defineProps<{
  items: AttendanceRequest[]
  filters: AttendanceFilters
  departments: string[]
  quota: AttendanceAnnualQuota | null
  stats: AttendanceDashboardStats
  employees: Employee[]
  employeesLoading: boolean
  currentUserId: string
  isAdmin: boolean
  loading: boolean
  formVisible: boolean
  formLoading: boolean
  formData: AttendanceFormState
  isEditForm: boolean
  toast: { show: boolean; message: string; type: 'success' | 'error' }
  rejectDialogVisible: boolean
  rejectTarget: AttendanceRequest | null
  rejectReason: string
  detailItem: AttendanceRequest | null
  detailSignatures: import('../services/attendance.service').SignatureInfo[]
}>()

const emit = defineEmits<{
  (e: 'update:filters', value: AttendanceFilters): void
  (e: 'update:formData', value: AttendanceFormState): void
  (e: 'update:rejectReason', value: string): void
  (e: 'openForm'): void
  (e: 'closeForm'): void
  (e: 'submitForm'): void
  (e: 'edit', item: AttendanceRequest): void
  (e: 'delete', item: AttendanceRequest): void
  (e: 'approve', item: AttendanceRequest): void
  (e: 'openReject', item: AttendanceRequest): void
  (e: 'adminEdit', item: AttendanceRequest): void
  (e: 'adminDelete', item: AttendanceRequest): void
  (e: 'openDetail', item: AttendanceRequest): void
  (e: 'closeDetail'): void
  (e: 'closeReject'): void
  (e: 'submitReject'): void
  (e: 'createEmployee', data: EmployeeFormData): void
  (e: 'updateEmployee', payload: { id: number; data: EmployeeFormData }): void
  (e: 'deleteEmployee', id: number): void
}>()

// 관리자 탭
const activeTab = ref<'requests' | 'employees'>('requests')

// 대기중 항목 (관리자 빠른처리)
const pendingItems = computed(() =>
  props.items.filter((i) => i.status === '대기중').slice(0, 10),
)

const statusBorder = (status: string) => {
  if (status === '승인') return 'border-l-emerald-500'
  if (status === '반려') return 'border-l-red-400'
  return 'border-l-amber-400'
}

const statusBadge = (status: string) => {
  if (status === '승인') return 'bg-emerald-100 text-emerald-700'
  if (status === '반려') return 'bg-red-100 text-red-600'
  return 'bg-amber-100 text-amber-700'
}

const leaveTypeBadge = (type: string) => {
  if (type.startsWith('반차')) return 'bg-blue-100 text-blue-700'
  if (type === '병가') return 'bg-purple-100 text-purple-700'
  if (type === '연차') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-500'
}

const formatDate = (d: string) => (d ? d.slice(0, 10) : '-')

const formatPeriod = (item: AttendanceRequest) =>
  item.startDate === item.endDate
    ? formatDate(item.startDate)
    : `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`

const thisMonthLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 pt-[72px]">
    <div class="mx-auto max-w-6xl px-4 py-8 md:px-6">

      <!-- 페이지 헤더 -->
      <div class="mb-7 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900">생산부 근태관리</h1>
          <p class="mt-1 text-sm text-slate-500">{{ thisMonthLabel }} 휴가 신청 및 근태 현황</p>
        </div>
        <button
          v-if="activeTab === 'requests'"
          type="button"
          class="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700"
          @click="emit('openForm')"
        >
          + 휴가 신청
        </button>
      </div>

      <!-- 통계 카드 4개 -->
      <div class="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-400">총 직원</p>
          <p class="mt-2 text-3xl font-extrabold text-slate-900">
            {{ stats.employeeCount }}<span class="ml-1 text-base font-bold text-slate-400">명</span>
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-400">이번달 신청</p>
          <p class="mt-2 text-3xl font-extrabold text-slate-900">
            {{ stats.thisMonthTotal }}<span class="ml-1 text-base font-bold text-slate-400">건</span>
          </p>
        </div>
        <div class="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p class="text-xs font-medium text-amber-500">승인 대기</p>
          <p class="mt-2 text-3xl font-extrabold text-amber-700">
            {{ stats.pendingCount }}<span class="ml-1 text-base font-bold text-amber-400">건</span>
          </p>
        </div>
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p class="text-xs font-medium text-emerald-500">내 잔여연차</p>
          <p class="mt-2 text-3xl font-extrabold text-emerald-700">
            {{ stats.myRemainingDays }}<span class="ml-1 text-base font-bold text-emerald-400">일</span>
          </p>
        </div>
      </div>

      <!-- 관리자 탭 -->
      <div v-if="isAdmin" class="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
        <button
          type="button"
          class="rounded-lg px-5 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'requests' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'requests'"
        >신청 현황</button>
        <button
          type="button"
          class="rounded-lg px-5 py-2 text-sm font-bold transition-colors"
          :class="activeTab === 'employees' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'"
          @click="activeTab = 'employees'"
        >직원 목록</button>
      </div>

      <!-- ═══ 직원 목록 탭 (관리자) ═══ -->
      <AttendanceEmployeeList
        v-if="isAdmin && activeTab === 'employees'"
        :employees="employees"
        :loading="employeesLoading"
        @create="emit('createEmployee', $event)"
        @update="emit('updateEmployee', $event)"
        @delete="emit('deleteEmployee', $event)"
      />

      <!-- ═══ 신청 현황 탭 ═══ -->
      <template v-if="!isAdmin || activeTab === 'requests'">

        <!-- 필터 -->
        <div class="mb-5">
          <AttendanceFiltersComp
            :filters="filters"
            :departments="departments"
            :is-admin="isAdmin"
            @update:filters="emit('update:filters', $event)"
          />
        </div>

        <!-- 로딩 -->
        <div v-if="loading" class="py-20 text-center">
          <div class="inline-block h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          <p class="mt-3 text-sm text-slate-400">불러오는 중...</p>
        </div>

        <template v-else>

          <!-- ── 관리자 뷰: 2컬럼 ── -->
          <div v-if="isAdmin" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- 전체 신청 현황 (2/3) -->
            <div class="lg:col-span-2">
              <h2 class="mb-3 text-sm font-extrabold text-slate-700">신청 현황</h2>
              <div v-if="items.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
                신청 내역이 없습니다.
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="item in items"
                  :key="item.id"
                  class="cursor-pointer rounded-2xl border border-l-4 border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
                  :class="statusBorder(item.status)"
                  @click.self="emit('openDetail', item)"
                >
                  <div class="flex flex-wrap items-start justify-between gap-2" @click="emit('openDetail', item)">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="leaveTypeBadge(item.leaveType)">
                        {{ item.leaveType }}
                      </span>
                      <span class="font-bold text-slate-900">{{ item.userName }}</span>
                      <span class="text-xs text-slate-400">{{ item.department }}</span>
                    </div>
                    <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="statusBadge(item.status)">
                      {{ item.status }}
                    </span>
                  </div>
                  <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600" @click="emit('openDetail', item)">
                    <span>{{ formatPeriod(item) }}</span>
                    <span class="font-bold text-slate-800">{{ item.daysCount }}일</span>
                    <span v-if="item.reason" class="truncate text-slate-400">{{ item.reason }}</span>
                  </div>
                  <div v-if="item.status === '반려' && item.rejectReason" class="mt-1.5 text-xs text-red-500">
                    반려 사유: {{ item.rejectReason }}
                  </div>
                  <div v-if="item.status === '승인' && item.approvedBy" class="mt-1.5 text-xs text-slate-400">
                    승인: {{ item.approvedBy }}
                  </div>
                  <!-- 관리자 수정/삭제 -->
                  <div class="mt-2 flex gap-2">
                    <button type="button" class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50" @click="emit('adminEdit', item)">수정</button>
                    <button type="button" class="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-50" @click="emit('adminDelete', item)">삭제</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 빠른 처리 패널 (1/3) -->
            <div>
              <h2 class="mb-3 text-sm font-extrabold text-slate-700">
                승인 대기
                <span v-if="pendingItems.length" class="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {{ pendingItems.length }}
                </span>
              </h2>
              <div v-if="pendingItems.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
                대기 중인 신청이 없습니다.
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="item in pendingItems"
                  :key="item.id"
                  class="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-slate-900">{{ item.userName }}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-bold" :class="leaveTypeBadge(item.leaveType)">
                      {{ item.leaveType }}
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-slate-500">{{ formatPeriod(item) }} · {{ item.daysCount }}일</p>
                  <p v-if="item.reason" class="mt-1 truncate text-xs text-slate-400">{{ item.reason }}</p>
                  <div class="mt-3 flex gap-2">
                    <button type="button" class="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-500" @click="emit('approve', item)">승인</button>
                    <button type="button" class="flex-1 rounded-lg bg-red-500 py-1.5 text-xs font-bold text-white hover:bg-red-400" @click="emit('openReject', item)">반려</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── 일반 사용자 뷰: 전체 신청 리스트 (읽기 전용 + 본인 것만 액션) ── -->
          <div v-else>
            <!-- 내 연차 잔여 바 -->
            <div v-if="quota" class="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div class="mb-2 flex items-center justify-between text-sm">
                <span class="font-bold text-slate-700">내 연차 현황</span>
                <span class="text-slate-500">{{ quota.usedDays }} / {{ quota.totalDays }}일 사용</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-all"
                  :style="{ width: `${quota.totalDays > 0 ? Math.min(100, (quota.usedDays / quota.totalDays) * 100) : 0}%` }"
                />
              </div>
              <p class="mt-1.5 text-right text-xs text-slate-400">잔여 {{ quota.remainingDays }}일</p>
            </div>

            <!-- 전체 신청 목록 -->
            <div v-if="items.length === 0" class="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
              신청 내역이 없습니다.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="item in items"
                :key="item.id"
                class="flex cursor-pointer items-center gap-3 rounded-2xl border border-l-4 border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
                :class="statusBorder(item.status)"
                @click="emit('openDetail', item)"
              >
                <!-- 이름 + 부서 -->
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-bold text-slate-900">{{ item.userName }}</span>
                    <span v-if="item.userId === currentUserId" class="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">나</span>
                    <span class="text-xs text-slate-400">{{ item.department }}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-bold" :class="leaveTypeBadge(item.leaveType)">{{ item.leaveType }}</span>
                  </div>
                  <p class="mt-0.5 text-xs text-slate-500">{{ formatPeriod(item) }} · {{ item.daysCount }}일<span v-if="item.reason"> · {{ item.reason }}</span></p>
                </div>

                <!-- 상태 + 본인 액션 -->
                <div class="flex shrink-0 items-center gap-2" @click.stop>
                  <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="statusBadge(item.status)">{{ item.status }}</span>
                  <template v-if="item.userId === currentUserId && item.status === '대기중'">
                    <button type="button" class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50" @click="emit('edit', item)">수정</button>
                    <button type="button" class="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-50" @click="emit('delete', item)">취소</button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- 신청 폼 모달 (formVisible 변경마다 key로 re-mount → 상태 초기화) -->
    <Teleport to="body">
      <div
        v-if="formVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="emit('closeForm')"
      >
        <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <h2 class="mb-5 text-lg font-extrabold text-slate-900">
            {{ isEditForm ? '휴가 신청 수정' : '휴가 신청' }}
          </h2>
          <AttendanceForm
            :key="String(isEditForm) + formData.startDate"
            :model-value="formData"
            :loading="formLoading"
            :is-edit="isEditForm"
            :employees="employees"
            @update:model-value="emit('update:formData', $event)"
            @submit="emit('submitForm')"
            @cancel="emit('closeForm')"
          />
        </div>
      </div>
    </Teleport>

    <!-- 반려 사유 모달 -->
    <Teleport to="body">
      <div
        v-if="rejectDialogVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        @click.self="emit('closeReject')"
      >
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <h2 class="mb-1 text-lg font-extrabold text-slate-900">반려 사유</h2>
          <p v-if="rejectTarget" class="mb-4 text-sm text-slate-500">
            {{ rejectTarget.userName }} · {{ rejectTarget.leaveType }} · {{ rejectTarget.daysCount }}일
          </p>
          <textarea
            :value="rejectReason"
            rows="3"
            placeholder="반려 사유를 입력하세요"
            class="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            @input="emit('update:rejectReason', ($event.target as HTMLTextAreaElement).value)"
          />
          <div class="mt-4 flex justify-end gap-3">
            <button type="button" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" @click="emit('closeReject')">취소</button>
            <button type="button" class="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400" @click="emit('submitReject')">반려 처리</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 디테일 모달 -->
    <Teleport to="body">
      <AttendanceDetailModal
        v-if="detailItem"
        :item="detailItem"
        :signatures="detailSignatures"
        @close="emit('closeDetail')"
      />
    </Teleport>

    <!-- 토스트 -->
    <Teleport to="body">
      <transition name="toast">
        <div
          v-if="toast.show"
          class="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg"
          :class="toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'"
        >
          {{ toast.message }}
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(16px); }
</style>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import AttendanceRequestSignatureDialog from '@/features/attendance/components/AttendanceRequestSignatureDialog.vue'
import { useWorkerAttendance } from '../composables/useWorkerAttendance'
import { leaveMonthLabel, requestOverlapsLeaveMonth, shiftLeaveMonth } from '../leaveMonth'
import WorkerLeaveApplyView from './WorkerLeaveApplyView.vue'
import WorkerLeaveList from './WorkerLeaveList.vue'

const props = defineProps<{
  userId: string
  name: string
  department: string
}>()

const {
  applicant,
  quota,
  requests,
  loading,
  loadFailed,
  formVisible,
  formLoading,
  signatureVisible,
  form,
  toast,
  openForm,
  closeForm,
  requestSubmit,
  confirmSignature,
  reload,
} = useWorkerAttendance({
  userId: toRef(props, 'userId'),
  name: toRef(props, 'name'),
  department: toRef(props, 'department'),
})

const monthOffset = ref(0)
const monthTitle = computed(() => leaveMonthLabel(monthOffset.value))
const visibleRequests = computed(() =>
  requests.value.filter((item) => requestOverlapsLeaveMonth(item, monthOffset.value)),
)
</script>

<template>
  <WorkerLeaveApplyView
    v-if="formVisible && applicant"
    :form="form"
    :employee="applicant"
    :loading="formLoading"
    :user-id="userId"
    @update:form="form = $event"
    @submit="requestSubmit"
    @cancel="closeForm"
  />

  <div v-else class="px-4 py-4">
    <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-bold text-emerald-600">{{ department || applicant?.department }}</p>
          <p class="mt-0.5 truncate text-lg font-extrabold text-slate-900">{{ name }}</p>
        </div>
        <div class="text-right">
          <p class="text-[11px] font-bold text-emerald-600">잔여 연차</p>
          <p class="mt-0.5 text-2xl font-extrabold text-emerald-700">
            {{ applicant?.remainingAnnualLeaveCount ?? 0 }}<span class="ml-0.5 text-sm">일</span>
          </p>
        </div>
      </div>
      <p v-if="quota" class="mt-3 border-t border-emerald-200 pt-3 text-right text-xs font-bold text-emerald-700">
        {{ quota.usedDays }} / {{ quota.totalDays }}일 사용
      </p>
      <button
        type="button"
        class="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-extrabold text-white disabled:opacity-40"
        :disabled="!applicant || loading"
        @click="openForm"
      >
        휴가 신청
      </button>
    </div>

    <div class="mb-3 mt-6 flex items-center justify-between gap-3">
      <h2 class="text-sm font-extrabold text-slate-700">{{ monthTitle }}</h2>
      <button
        type="button"
        class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        aria-label="새로고침"
        :disabled="loading"
        @click="reload"
      >
        <svg
          class="h-5 w-5"
          :class="loading ? 'animate-spin' : ''"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M20 12a8 8 0 00-13.66-5.66M4 4v5h5M4 12a8 8 0 0013.66 5.66M20 20v-5h-5"
          />
        </svg>
      </button>
    </div>

    <div class="mb-3 grid grid-cols-3 gap-2">
      <button
        type="button"
        class="rounded-xl bg-white py-2 text-sm font-extrabold text-slate-600"
        @click="monthOffset = shiftLeaveMonth(monthOffset, -1)"
      >
        지난달
      </button>
      <button
        type="button"
        class="rounded-xl py-2 text-sm font-extrabold"
        :class="monthOffset === 0 ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'"
        @click="monthOffset = 0"
      >
        이번달
      </button>
      <button
        type="button"
        class="rounded-xl bg-white py-2 text-sm font-extrabold text-slate-600 disabled:opacity-40"
        :disabled="monthOffset === 0"
        @click="monthOffset = shiftLeaveMonth(monthOffset, 1)"
      >
        다음달
      </button>
    </div>

    <div v-if="loading" class="py-16 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
    </div>
    <p v-else-if="loadFailed" class="py-10 text-center text-sm font-bold text-red-500">
      불러오지 못했습니다.
    </p>
    <p
      v-else-if="visibleRequests.length === 0"
      class="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400"
    >
      신청 내역이 없습니다.
    </p>
    <WorkerLeaveList v-else :items="visibleRequests" />
  </div>

  <AttendanceRequestSignatureDialog
    v-if="signatureVisible"
    @confirm="confirmSignature"
    @cancel="signatureVisible = false"
  />

  <Teleport to="body">
    <div
      v-if="toast.show"
      class="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg"
      :class="toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'"
    >
      {{ toast.message }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AttendanceRequestHistoryView from '@/features/attendance/components/AttendanceRequestHistoryView.vue'
import AttendanceDetailModal from '@/features/attendance/components/AttendanceDetailModal.vue'
import {
  fetchEmployeeAttendanceRequests,
  fetchEmployees,
  fetchSignatures,
  subscribeAttendanceRequests,
  unsubscribeAttendance,
  type SignatureInfo,
} from '@/features/attendance/services/attendance.service'
import type { AttendanceRequest, Employee } from '@/features/attendance/types/attendance'

const route = useRoute()
const router = useRouter()

const userName = computed(() => String(route.query.name ?? '').trim())
const department = computed(() => String(route.query.department ?? '').trim())

const items = ref<AttendanceRequest[]>([])
const employees = ref<Employee[]>([])
const loading = ref(false)
const detailItem = ref<AttendanceRequest | null>(null)
const detailSignatures = ref<SignatureInfo[]>([])
const SIGNATURE_NAMES = ['쩌민튼', 'duko777@niceentech.kr'] as const

async function loadItems({ silent = false } = {}) {
  if (!userName.value || !department.value) return
  if (!silent) loading.value = true
  try {
    items.value = await fetchEmployeeAttendanceRequests(userName.value, department.value)
  } catch {
    items.value = []
  } finally {
    if (!silent) loading.value = false
  }
}

async function loadEmployees() {
  try {
    employees.value = await fetchEmployees()
  } catch {
    employees.value = []
  }
}

async function openDetail(item: AttendanceRequest) {
  detailItem.value = item
  try {
    const names = [...SIGNATURE_NAMES]
    if (item.gyeongyuBy && !names.includes(item.gyeongyuBy as typeof names[number])) {
      (names as string[]).push(item.gyeongyuBy)
    }
    detailSignatures.value = await fetchSignatures(names)
  } catch {
    detailSignatures.value = SIGNATURE_NAMES.map((name) => ({ name, signaturePath: null }))
  }
}

function closeDetail() {
  detailItem.value = null
  detailSignatures.value = []
}

function goBack() {
  router.push({ name: 'attendance' })
}

watch([userName, department], ([name, dept]) => {
  if (!name || !dept) {
    router.replace({ name: 'attendance' })
    return
  }
  void loadItems()
}, { immediate: true })

let channel: ReturnType<typeof subscribeAttendanceRequests> | null = null

onMounted(() => {
  void loadEmployees()
  channel = subscribeAttendanceRequests(() => {
    void loadItems({ silent: true })
  })
})

onUnmounted(() => {
  if (channel) unsubscribeAttendance(channel)
})
</script>

<template>
  <AttendanceRequestHistoryView
    :user-name="userName"
    :department="department"
    :items="items"
    :loading="loading"
    @back="goBack"
    @open-detail="openDetail"
  />

  <Teleport to="body">
    <AttendanceDetailModal
      v-if="detailItem"
      :item="detailItem"
      :employees="employees"
      :signatures="detailSignatures"
      @close="closeDetail"
    />
  </Teleport>
</template>

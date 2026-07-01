<script setup lang="ts">
import type { AttendanceRequestNotification } from '../types/attendanceNotification'

defineProps<{
  notifications: AttendanceRequestNotification[]
  unreadCount: number
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'open', notification: AttendanceRequestNotification): void
  (e: 'mark-all-read'): void
}>()

const formatDateTime = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}.${day} ${hh}:${mm}`
}
</script>

<template>
  <div v-if="unreadCount > 0 || notifications.length > 0" class="mb-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
    <div class="mb-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-extrabold text-slate-900">휴가 신청 알림</h2>
        <span
          v-if="unreadCount > 0"
          class="inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </div>
      <button
        v-if="unreadCount > 0"
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        @click="emit('mark-all-read')"
      >
        전체 읽음
      </button>
    </div>

    <div v-if="loading" class="py-6 text-center text-sm text-slate-400">불러오는 중...</div>
    <div v-else class="space-y-2">
      <button
        v-for="item in notifications.slice(0, 10)"
        :key="item.id"
        type="button"
        class="flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
        :class="item.isRead ? 'border-slate-100 bg-slate-50/50' : 'border-blue-200 bg-blue-50/40'"
        @click="emit('open', item)"
      >
        <span
          class="mt-1 h-2 w-2 shrink-0 rounded-full"
          :class="item.isRead ? 'bg-slate-300' : 'bg-blue-500'"
        />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-extrabold text-slate-900">{{ item.title }}</span>
          <span class="mt-0.5 block truncate text-xs text-slate-600">{{ item.message }}</span>
          <span class="mt-1 block text-[11px] text-slate-400">{{ formatDateTime(item.createdAt) }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

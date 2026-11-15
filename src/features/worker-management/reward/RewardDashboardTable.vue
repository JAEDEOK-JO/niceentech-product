<script setup>
import { formatRewardWon } from '@/features/worker/reward/rewardAmount'

defineProps({
  items: { type: Array, required: true },
  savingId: { type: String, default: '' },
})

const emit = defineEmits(['review', 'open'])

const formatWhen = (value) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const statusClass = (status) => {
  if (status === '승인') return 'bg-emerald-100 text-emerald-700'
  if (status === '반려') return 'bg-red-100 text-red-600'
  return 'bg-amber-100 text-amber-700'
}

const photoUrls = (item) => [...(item.problemPhotoUrls || []), ...(item.normalPhotoUrls || [])]
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <p v-if="items.length === 0" class="py-16 text-center text-sm font-bold text-slate-400">없음</p>

    <div v-else class="hidden overflow-x-auto md:block">
      <table class="min-w-full border-collapse text-sm">
        <thead>
          <tr class="bg-slate-50 text-center text-xs font-bold text-slate-500">
            <th class="whitespace-nowrap border border-slate-200 px-3 py-3">일시</th>
            <th class="whitespace-nowrap border border-slate-200 px-3 py-3">신청자</th>
            <th class="border border-slate-200 px-3 py-3">내용</th>
            <th class="whitespace-nowrap border border-slate-200 px-3 py-3">사진</th>
            <th class="whitespace-nowrap border border-slate-200 px-3 py-3">금액</th>
            <th class="whitespace-nowrap border border-slate-200 px-3 py-3">상태</th>
            <th class="whitespace-nowrap border border-slate-200 px-3 py-3">처리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50">
            <td class="whitespace-nowrap border border-slate-200 px-3 py-3 text-center text-xs font-medium text-slate-600">
              {{ formatWhen(item.created_at) }}
            </td>
            <td class="whitespace-nowrap border border-slate-200 px-3 py-3 text-center">
              <p class="font-extrabold text-slate-900">{{ item.name }}</p>
              <p class="mt-0.5 text-xs text-slate-400">{{ item.department || '-' }}</p>
            </td>
            <td class="border border-slate-200 px-3 py-3">
              <p class="break-words font-bold text-slate-900">{{ item.found_note }}</p>
              <p v-if="item.original_note" class="mt-1 break-words text-xs text-slate-500">{{ item.original_note }}</p>
            </td>
            <td class="border border-slate-200 px-3 py-3 text-center">
              <button
                v-if="photoUrls(item).length"
                type="button"
                class="relative inline-block h-14 w-16 overflow-hidden rounded-lg bg-slate-100"
                @click="emit('open', photoUrls(item))"
              >
                <img :src="photoUrls(item)[0]" alt="" class="h-full w-full object-cover" />
                <span class="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] font-bold text-white">
                  {{ photoUrls(item).length }}장
                </span>
              </button>
              <span v-else class="text-xs text-slate-300">-</span>
            </td>
            <td class="whitespace-nowrap border border-slate-200 px-3 py-3 text-center font-extrabold text-slate-900">
              {{ formatRewardWon(item.amount) }}
            </td>
            <td class="whitespace-nowrap border border-slate-200 px-3 py-3 text-center">
              <span class="rounded-full px-2.5 py-1 text-[11px] font-bold" :class="statusClass(item.status)">
                {{ item.status }}
              </span>
            </td>
            <td class="whitespace-nowrap border border-slate-200 px-3 py-3 text-center">
              <div v-if="item.status === '대기'" class="flex justify-center gap-1.5">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-extrabold text-slate-600 disabled:opacity-40"
                  :disabled="savingId === item.id"
                  @click="emit('review', item.id, '반려')"
                >
                  반려
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-extrabold text-white disabled:opacity-40"
                  :disabled="savingId === item.id"
                  @click="emit('review', item.id, '승인')"
                >
                  승인
                </button>
              </div>
              <span v-else class="text-xs text-slate-300">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ul class="divide-y divide-slate-100 md:hidden">
      <li v-for="item in items" :key="item.id" class="px-4 py-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-extrabold text-slate-900">{{ item.name }}</p>
            <p class="mt-0.5 text-xs font-bold text-slate-500">{{ item.department || '-' }} · {{ formatWhen(item.created_at) }}</p>
          </div>
          <span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold" :class="statusClass(item.status)">
            {{ item.status }}
          </span>
        </div>
        <p class="mt-2 break-words text-sm font-bold text-slate-900">{{ item.found_note }}</p>
        <p class="mt-2 text-sm font-extrabold text-slate-900">{{ formatRewardWon(item.amount) }}</p>
        <div v-if="item.status === '대기'" class="mt-3 flex gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-600 disabled:opacity-40"
            :disabled="savingId === item.id"
            @click="emit('review', item.id, '반려')"
          >
            반려
          </button>
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40"
            :disabled="savingId === item.id"
            @click="emit('review', item.id, '승인')"
          >
            승인
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

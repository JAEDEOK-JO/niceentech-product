<script setup>
import { useDialog } from '@/composables/useDialog'

defineProps({
  open: { type: Boolean, default: false },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  downloadingId: { type: [Number, String], default: '' },
  deletingId: { type: [Number, String], default: '' },
})

const emit = defineEmits(['close', 'download', 'delete'])

const { confirm } = useDialog()

const columnLabel = (column) => [column.columnDate, column.memo].filter(Boolean).join(' ')

const requestDelete = async (row) => {
  const confirmed = await confirm('삭제하시겠습니까?')
  if (!confirmed) return
  emit('delete', row)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="emit('close')"
    >
      <div
        tabindex="-1"
        class="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl outline-none"
        @keydown.esc.prevent="emit('close')"
      >
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-base font-extrabold text-slate-900">산출서 내역</h3>
          <button type="button" class="text-sm font-bold text-slate-500 hover:text-slate-700" @click="emit('close')">
            닫기
          </button>
        </div>

        <p v-if="loading" class="mt-4 text-sm font-bold text-slate-500">불러오는 중입니다.</p>

        <div v-else class="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          <article
            v-for="row in rows"
            :key="row.id"
            class="rounded-xl border border-slate-200 px-3 py-3"
          >
            <p class="text-sm font-extrabold text-slate-900">{{ row.createdDate }}</p>
            <p
              v-for="(column, index) in row.columns"
              :key="`${row.id}-${index}`"
              class="mt-1 truncate text-sm font-bold text-slate-700"
            >
              {{ columnLabel(column) }}
            </p>
            <div class="mt-3 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-40"
                :disabled="downloadingId === row.id || deletingId === row.id"
                @click="emit('download', row)"
              >
                엑셀 다운로드
              </button>
              <button
                type="button"
                class="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                :disabled="downloadingId === row.id || deletingId === row.id"
                @click="requestDelete(row)"
              >
                삭제
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  </Teleport>
</template>

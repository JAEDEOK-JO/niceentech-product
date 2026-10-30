<script setup>
import { ref, watch } from 'vue'
import { QUANTITY_SLOT_COUNT } from '../quantity-export/quantitySheetMap'

const props = defineProps({
  open: { type: Boolean, default: false },
  rows: { type: Array, default: () => [] },
  creating: { type: Boolean, default: false },
  max: { type: Number, default: QUANTITY_SLOT_COUNT },
})

const emit = defineEmits(['close', 'create'])

const panelEl = ref(null)
const checkedIds = ref([])

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    checkedIds.value = []
    requestAnimationFrame(() => panelEl.value?.focus())
  },
)

const isChecked = (localId) => checkedIds.value.includes(localId)

const toggleRow = (localId) => {
  if (props.creating) return
  if (isChecked(localId)) {
    checkedIds.value = checkedIds.value.filter((id) => id !== localId)
    return
  }
  if (checkedIds.value.length >= props.max) return
  checkedIds.value = [...checkedIds.value, localId]
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 px-4"
      @click.self="creating ? null : emit('close')"
    >
      <div
        ref="panelEl"
        tabindex="-1"
        class="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl outline-none"
        @keydown.esc.prevent="creating ? null : emit('close')"
      >
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-base font-extrabold text-slate-900">엑셀출력</h3>
          <button
            type="button"
            class="text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-40"
            :disabled="creating"
            @click="emit('close')"
          >
            닫기
          </button>
        </div>

        <div class="mt-4 grid grid-cols-[1.25rem_5.5rem_minmax(0,1fr)] gap-x-3 px-3 text-xs font-extrabold text-slate-500">
          <span></span>
          <span>일자</span>
          <span>내역</span>
        </div>

        <div class="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">
          <label
            v-for="row in rows"
            :key="row.localId"
            class="grid cursor-pointer grid-cols-[1.25rem_5.5rem_minmax(0,1fr)] items-center gap-x-3 rounded-lg border border-slate-200 px-3 py-2"
            :class="!isChecked(row.localId) && checkedIds.length >= max ? 'cursor-default opacity-40' : ''"
          >
            <input
              type="checkbox"
              class="h-4 w-4"
              :checked="isChecked(row.localId)"
              :disabled="creating || (!isChecked(row.localId) && checkedIds.length >= max)"
              @change="toggleRow(row.localId)"
            />
            <span class="text-sm font-extrabold text-slate-900">{{ row.date }}</span>
            <span class="truncate text-sm font-bold text-slate-800">{{ row.memo }}</span>
          </label>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-40"
            :disabled="creating || checkedIds.length === 0"
            @click="emit('create', [...checkedIds])"
          >
            엑셀만들기
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

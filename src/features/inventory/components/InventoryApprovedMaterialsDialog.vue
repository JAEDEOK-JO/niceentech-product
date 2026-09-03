<script setup>
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import ApprovedMaterialTagsInput from '@/features/company/ApprovedMaterialTagsInput.vue'
import { uniqueApprovedMaterialNames } from '@/features/company/approvedMaterials'

const props = defineProps({
  open: { type: Boolean, default: false },
  names: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const draft = ref([])

watch(
  () => [props.open, props.names],
  () => {
    if (!props.open) return
    draft.value = uniqueApprovedMaterialNames(props.names)
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 class="text-base font-extrabold text-slate-900">승인자재</h2>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </header>
        <div class="px-5 py-4">
          <ApprovedMaterialTagsInput v-model="draft" />
        </div>
        <footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            class="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            @click="emit('close')"
          >
            닫기
          </button>
          <button
            type="button"
            class="h-10 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-50"
            :disabled="saving"
            @click="emit('save', draft)"
          >
            저장
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Loader2, Settings } from 'lucide-vue-next'

defineProps({
  materialLabel: { type: String, required: true },
  excelParsing: { type: Boolean, default: false },
  excelDisabled: { type: Boolean, default: false },
})

const emit = defineEmits(['add-material', 'upload-excel'])

const open = ref(false)
const root = ref(null)

const close = () => {
  open.value = false
}

const toggle = () => {
  open.value = !open.value
}

const onDocumentClick = (event) => {
  if (!root.value?.contains(event.target)) close()
}

const pick = (eventName) => {
  close()
  emit(eventName)
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      title="설정"
      aria-label="설정"
      @click.stop="toggle"
    >
      <Settings class="h-4 w-4" />
    </button>
    <div
      v-if="open"
      class="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
    >
      <button
        type="button"
        class="flex w-full items-center px-3 py-2 text-left text-xs font-extrabold text-slate-700 hover:bg-slate-50"
        @click="pick('add-material')"
      >
        {{ materialLabel }}추가
      </button>
      <button
        type="button"
        class="flex w-full items-center px-3 py-2 text-left text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        :disabled="excelParsing || excelDisabled"
        @click="pick('upload-excel')"
      >
        <Loader2 v-if="excelParsing" class="mr-1 h-3.5 w-3.5 animate-spin" />
        엑셀 업로드
      </button>
    </div>
  </div>
</template>

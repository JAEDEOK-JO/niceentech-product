<script setup>
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import { vVirtualKeyboard } from '@/features/virtual-keyboard/directives/vVirtualKeyboard'
import { addMakerCatalog, fetchMakerCatalog } from '@/features/main/maker/makerCatalog'
import { MAKER_PRESETS, parseMaker, sortMakerNames } from '@/features/main/maker/makerOptions'

const props = defineProps({
  open: { type: Boolean, default: false },
  company: { type: String, default: '' },
  place: { type: String, default: '' },
  area: { type: String, default: '' },
  maker: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save'])

const selected = ref([])
const catalog = ref([])
const draft = ref('')

const names = computed(() => sortMakerNames([...MAKER_PRESETS.map((item) => item.name), ...catalog.value, ...selected.value]))

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    draft.value = ''
    selected.value = [...parseMaker(props.maker).presets]
    catalog.value = await fetchMakerCatalog()
  },
)

function toggle(name) {
  selected.value = selected.value.includes(name)
    ? selected.value.filter((item) => item !== name)
    : [...selected.value, name]
}

async function addName() {
  const name = draft.value.trim()
  if (!name) return
  const added = names.value.includes(name) || (await addMakerCatalog(name))
  if (!added) return
  if (!catalog.value.includes(name) && !MAKER_PRESETS.some((item) => item.name === name)) {
    catalog.value = [...catalog.value, name]
  }
  if (!selected.value.includes(name)) selected.value = [...selected.value, name]
  draft.value = ''
}

function submit() {
  emit('save', { presets: selected.value })
}
</script>

<template>
  <div v-if="open" class="print-hide fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h3 class="text-base font-extrabold text-slate-900">메이커</h3>
          <p class="mt-2 truncate text-sm font-semibold text-slate-700">{{ company || '-' }} / {{ place || '-' }}</p>
          <p class="truncate text-sm text-slate-500">{{ area || '-' }}</p>
        </div>
        <button type="button" class="text-sm text-slate-500 hover:text-slate-700" @click="emit('close')">닫기</button>
      </div>

      <div class="mt-5 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
        <button
          v-for="name in names"
          :key="name"
          type="button"
          class="h-11 rounded-xl border text-sm font-extrabold"
          :class="selected.includes(name) ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'"
          @click="toggle(name)"
        >
          {{ name }}
        </button>
      </div>

      <div class="mt-4 flex gap-2">
        <Input v-model="draft" v-virtual-keyboard class="h-11" type="text" maxlength="20" placeholder="메이커" @keydown.enter.prevent="addName" />
        <Button class="h-11 shrink-0 px-4 text-sm" variant="outline" @click="addName">추가</Button>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <Button class="h-10 px-4 text-sm" variant="outline" @click="emit('close')">닫기</Button>
        <Button class="h-10 px-4 text-sm" @click="submit">저장</Button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { parseApprovedMaterialNames, uniqueApprovedMaterialNames } from './approvedMaterials'
import { fetchApprovedMaterialBrandOptions } from './approvedMaterials.service'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const draft = ref('')
const loadedOptions = ref([])

const tags = computed(() => uniqueApprovedMaterialNames(props.modelValue))
const suggestionSource = computed(() =>
  uniqueApprovedMaterialNames([...(props.options ?? []), ...loadedOptions.value]),
)

const suggestions = computed(() => {
  const keyword = draft.value.trim().toLocaleLowerCase('ko')
  if (!keyword) return []
  return suggestionSource.value
    .filter((name) => name.toLocaleLowerCase('ko').includes(keyword))
    .filter((name) => !tags.value.some((tag) => tag.toLocaleLowerCase('ko') === name.toLocaleLowerCase('ko')))
    .slice(0, 8)
})

const setTags = (names) => {
  emit('update:modelValue', uniqueApprovedMaterialNames(names))
}

const addName = (value) => {
  const next = parseApprovedMaterialNames(value)
  if (next.length === 0) return
  setTags([...tags.value, ...next])
  draft.value = ''
}

const removeTag = (name) => {
  setTags(tags.value.filter((tag) => tag !== name))
}

const onDraftKeydown = (event) => {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addName(draft.value)
  }
  if (event.key === 'Backspace' && !draft.value && tags.value.length > 0) {
    removeTag(tags.value[tags.value.length - 1])
  }
}

onMounted(async () => {
  if ((props.options ?? []).length > 0) return
  try {
    loadedOptions.value = await fetchApprovedMaterialBrandOptions()
  } catch {
    loadedOptions.value = []
  }
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white px-2 py-2">
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="tag in tags"
        :key="tag"
        class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-800"
      >
        {{ tag }}
        <button type="button" class="text-slate-400 hover:text-slate-700" @click="removeTag(tag)">
          <X class="h-3 w-3" />
        </button>
      </span>
      <input
        v-model="draft"
        type="text"
        class="min-w-[7rem] flex-1 bg-transparent px-1 py-1 text-sm font-bold text-slate-800 outline-none"
        placeholder="자재명"
        @keydown="onDraftKeydown"
        @blur="addName(draft)"
      />
    </div>
    <div v-if="suggestions.length > 0" class="mt-1 flex flex-wrap gap-1">
      <button
        v-for="name in suggestions"
        :key="name"
        type="button"
        class="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-extrabold text-blue-700 hover:bg-blue-100"
        @mousedown.prevent="addName(name)"
      >
        {{ name }}
      </button>
    </div>
  </div>
</template>

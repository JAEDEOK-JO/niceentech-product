<script setup>
import { computed, ref } from 'vue'
import { noticeTextDir, noticeTranslationList } from './noticeLanguages'

const props = defineProps({
  translations: {
    type: Object,
    default: () => ({}),
  },
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])
const open = ref(false)
const entries = computed(() => noticeTranslationList(props.translations))

function toggle() {
  open.value = !open.value
  if (!open.value) emit('update:modelValue', '')
}

function pick(code) {
  emit('update:modelValue', props.modelValue === code ? '' : code)
}
</script>

<template>
  <div v-if="entries.length" class="mt-3" @click.stop>
    <button type="button" class="text-base font-extrabold text-blue-700" @click="toggle">번역하기(Translate)</button>
    <div v-if="open" class="mt-2 flex flex-wrap gap-2">
      <button
        v-for="language in entries"
        :key="language.code"
        type="button"
        class="rounded-lg px-3 py-1.5 text-base font-extrabold"
        :dir="noticeTextDir(language.code)"
        :class="modelValue === language.code ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'"
        @click="pick(language.code)"
      >
        {{ language.action }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { NOTICE_LANGUAGES, noticeTextDir } from './noticeLanguages'

const model = defineModel({
  type: Object,
  default: () => ({}),
})

defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})

const picking = ref(false)
const added = computed(() => NOTICE_LANGUAGES.filter((language) => Object.prototype.hasOwnProperty.call(model.value, language.code)))
const remaining = computed(() => NOTICE_LANGUAGES.filter((language) => !Object.prototype.hasOwnProperty.call(model.value, language.code)))

function add(code) {
  model.value = { ...model.value, [code]: '' }
  picking.value = false
}

function update(code, text) {
  model.value = { ...model.value, [code]: text }
}

function remove(code) {
  const next = { ...model.value }
  delete next[code]
  model.value = next
}
</script>

<template>
  <div class="grid gap-3">
    <section v-for="language in added" :key="language.code" class="grid gap-2">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-extrabold text-slate-800">{{ language.label }}</p>
        <button type="button" class="text-sm font-bold text-slate-500" :disabled="disabled" @click="remove(language.code)">
          지우기
        </button>
      </div>
      <textarea
        :value="typeof model[language.code] === 'string' ? model[language.code] : ''"
        rows="4"
        placeholder="내용"
        class="w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400"
        :dir="noticeTextDir(language.code)"
        :disabled="disabled"
        @input="update(language.code, $event.target.value)"
      />
    </section>
    <button
      v-if="remaining.length && !picking"
      type="button"
      class="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm font-extrabold text-slate-700 disabled:opacity-40"
      :disabled="disabled"
      @click="picking = true"
    >
      번역 추가
    </button>
    <div v-if="picking" class="flex flex-wrap gap-2">
      <button
        v-for="language in remaining"
        :key="language.code"
        type="button"
        class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-extrabold text-slate-700"
        :disabled="disabled"
        @click="add(language.code)"
      >
        {{ language.label }}
      </button>
    </div>
  </div>
</template>

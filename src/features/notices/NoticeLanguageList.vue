<script setup>
import { computed } from 'vue'
import { NOTICE_LANGUAGES } from './noticeLanguages'

const text = computed(() => NOTICE_LANGUAGES.map((language) => language.label).join(', '))
</script>

<template>
  <div class="grid gap-1">
    <p class="text-sm font-bold text-slate-900">자동번역되는 언어 목록</p>
    <p class="text-sm leading-6 text-slate-600">{{ text }}</p>
  </div>
</template>

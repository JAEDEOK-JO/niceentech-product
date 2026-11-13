<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  department: string
}>()

const accountLabel = computed(() => {
  const name = props.name.trim()
  const department = props.department.trim()
  if (!name) return ''
  if (!department) return name
  return `${name}(${department})`
})
</script>

<template>
  <header class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 pt-[max(12px,env(safe-area-inset-top))]">
    <p class="text-base font-extrabold tracking-tight text-slate-900">NICEENTECH</p>
    <p class="truncate text-sm font-bold text-slate-600">{{ accountLabel }}</p>
  </header>
</template>

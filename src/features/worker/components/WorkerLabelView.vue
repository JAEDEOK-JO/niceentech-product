<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <div class="flex h-full items-center justify-center">
    <p class="text-lg font-extrabold text-slate-900">{{ label }}</p>
  </div>
</template>

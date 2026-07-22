<script setup lang="ts">
defineProps<{
  count: number
}>()
</script>

<template>
  <span
    v-if="count > 0"
    class="shrink-0 text-[10px] font-bold leading-none text-amber-500"
  >{{ count > 99 ? '99+' : count }}</span>
</template>

<script setup>
import { cn } from '@/lib/utils'

const props = defineProps({
  class: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <section :class="cn('rounded-2xl border bg-white shadow-sm', props.class)">
    <slot />
  </section>
</template>

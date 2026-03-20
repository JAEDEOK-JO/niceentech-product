<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
  },
  class: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const classes = computed(() =>
  cn(
    'inline-flex cursor-pointer items-center justify-center rounded-xl text-sm font-semibold transition-colors h-11 px-4',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    props.variant === 'default' &&
      'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
    props.variant === 'outline' &&
      'border bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-300',
    props.class,
  ),
)
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>

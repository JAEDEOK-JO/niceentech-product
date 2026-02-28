<script setup>
import { computed, useAttrs } from 'vue'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  class: {
    type: String,
    default: '',
  },
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])
const attrs = useAttrs()

const classes = computed(() =>
  cn(
    'flex h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm',
    'placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    props.class,
  ),
)
</script>

<template>
  <input
    v-bind="attrs"
    :class="classes"
    :value="modelValue"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>

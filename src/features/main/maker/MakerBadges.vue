<script setup>
import { computed } from 'vue'
import { makerDisplayItems } from '@/features/main/maker/makerOptions'

const props = defineProps({
  maker: { type: String, default: '' },
})

const items = computed(() => makerDisplayItems(props.maker))
const layoutClass = computed(() => {
  if (items.value.length === 2) return 'flex-col gap-0.5'
  if (items.value.length === 3) return 'flex-row flex-nowrap gap-1'
  if (items.value.length > 3) return 'grid grid-cols-2'
  return ''
})
</script>

<template>
  <span class="flex max-h-[48px] w-full items-center justify-center overflow-hidden" :class="layoutClass">
    <span
      v-for="item in items"
      :key="item.key"
      class="whitespace-nowrap text-center text-[15px] font-extrabold leading-none"
      :class="item.badgeClass"
    >
      {{ item.label }}
    </span>
  </span>
</template>

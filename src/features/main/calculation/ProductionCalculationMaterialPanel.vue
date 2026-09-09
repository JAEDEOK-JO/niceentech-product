<script setup>
import { computed } from 'vue'
import { vVirtualKeyboard } from '@/features/virtual-keyboard/directives/vVirtualKeyboard'

const props = defineProps({
  items: { type: Array, default: () => [] },
  quantities: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:quantities'])

const groupedItems = computed(() => {
  const groups = []
  for (const item of props.items ?? []) {
    const name = String(item.material_group || item.name || '기타')
    let group = groups.find((target) => target.name === name)
    if (!group) {
      group = { name, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
})

const quantityOf = (item) => props.quantities?.[String(item.id)] ?? ''

const setQuantity = (item, value) => {
  emit('update:quantities', {
    ...props.quantities,
    [String(item.id)]: value,
  })
}
</script>

<template>
  <div v-if="groupedItems.length === 0" class="py-10 text-center text-sm font-bold text-slate-400">
    품목 없음
  </div>
  <div v-else class="grid gap-3">
    <section v-for="group in groupedItems" :key="group.name" class="overflow-hidden rounded-xl border border-slate-200">
      <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-extrabold text-slate-800">
        {{ group.name }}
      </div>
      <div class="grid grid-cols-5 gap-2 p-2">
        <label
          v-for="item in group.items"
          :key="item.id"
          class="flex min-w-0 flex-col gap-1.5 rounded-lg border border-slate-200 px-2 py-2"
        >
          <span class="line-clamp-2 min-h-8 text-center text-xs font-extrabold leading-4 text-slate-900">{{ item.spec }}</span>
          <input
            v-virtual-keyboard
            :value="quantityOf(item)"
            type="number"
            step="0.01"
            inputmode="decimal"
            class="qty-input h-9 w-full rounded-lg border border-slate-200 px-1 text-center text-sm font-extrabold text-slate-900 outline-none focus:border-slate-400"
            @input="setQuantity(item, $event.target.value)"
          />
        </label>
      </div>
    </section>
  </div>
</template>

<style scoped>
.qty-input[type='number'] {
  -moz-appearance: textfield;
}

.qty-input[type='number']::-webkit-inner-spin-button,
.qty-input[type='number']::-webkit-outer-spin-button {
  margin: 0;
  -webkit-appearance: none;
}
</style>

<script setup>
import { vVirtualKeyboard } from '@/features/virtual-keyboard/directives/vVirtualKeyboard'

const model = defineModel({ type: String, default: '' })
</script>

<template>
  <input
    v-model="model"
    v-virtual-keyboard
    type="search"
    class="h-9 w-full min-w-[90px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-500 md:w-28"
    placeholder="검색"
  />
</template>

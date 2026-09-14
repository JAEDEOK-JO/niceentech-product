<script setup>
const model = defineModel({ type: String, default: '' })
</script>

<template>
  <input
    v-model="model"
    type="search"
    class="h-8 w-full min-w-[220px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-500"
    placeholder="ค้นหาหมายเลขแบบ"
    aria-label="ค้นหาหมายเลขแบบ"
  />
</template>

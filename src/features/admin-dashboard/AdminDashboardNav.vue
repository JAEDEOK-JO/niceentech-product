<script setup>
import { adminDashboardLinks } from '@/features/admin-dashboard/adminDashboardConfig'

defineProps({
  currentPath: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <RouterLink
      v-for="item in adminDashboardLinks"
      :key="item.key"
      :to="item.path"
      class="rounded-2xl border px-4 py-2 text-sm font-bold transition"
      :class="
        currentPath === item.path
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      "
    >
      {{ item.label }}
    </RouterLink>
  </div>
</template>

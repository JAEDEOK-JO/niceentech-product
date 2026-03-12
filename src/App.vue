<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import GlobalAppBar from '@/components/layout/GlobalAppBar.vue'

const route = useRoute()
const showGlobalAppBar = computed(() => route.meta.requiresAuth === true)
</script>

<template>
  <div class="min-h-screen bg-white">
    <GlobalAppBar v-if="showGlobalAppBar" />
    <div :class="showGlobalAppBar ? 'app-with-bar pt-[72px]' : ''">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
@media print {
  .app-with-bar {
    padding-top: 0 !important;
  }
}
</style>

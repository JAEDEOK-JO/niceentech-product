<script setup lang="ts">
import type { PrintEntryWithType } from '../../types/print'
import MainPipeCard from './MainPipeCard.vue'

defineProps<{
  pages: PrintEntryWithType[][]
  active: boolean
}>()
</script>

<template>
  <section class="main-pipe-print" :class="{ 'is-print-active': active }">
    <div
      v-for="(pageCards, pageIndex) in pages"
      :key="pageIndex"
      class="main-pipe-sheet"
    >
      <MainPipeCard
        v-for="(card, cardIndex) in pageCards"
        :key="`${pageIndex}-${cardIndex}-${card.entry.indices.join('-')}-${card.type}`"
        :card="card"
      />
    </div>
  </section>
</template>

<style scoped>
.main-pipe-print {
  display: none;
}

@media print {
  .main-pipe-print.is-print-active {
    display: block !important;
    color: #000;
    font-family: TheJamsil, sans-serif !important;
  }

  .main-pipe-print.is-print-active,
  .main-pipe-print.is-print-active * {
    font-family: TheJamsil, sans-serif !important;
  }

  .main-pipe-sheet {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: repeat(3, 1fr);
    gap: 12px;
    height: 265mm;
    page-break-after: always;
    break-after: page;
  }

  .main-pipe-sheet:last-child {
    page-break-after: auto;
    break-after: auto;
  }
}
</style>

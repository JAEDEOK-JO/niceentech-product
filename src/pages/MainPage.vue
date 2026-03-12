<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainProductionPlanView from '@/features/main/MainProductionPlanView.vue'
import { useAuth } from '@/composables/useAuth'
import { useProductionPlan } from '@/composables/useProductionPlan'

const router = useRouter()
const route = useRoute()
const { session } = useAuth()
const {
  weekOffset,
  selectedTuesdayIso,
  searchText,
  planLoading,
  planError,
  pageTitle,
  moveWeek,
  resetWeek,
  setSelectedTuesday,
  groupedRows,
} = useProductionPlan(session)

const goRegister = () => {
  router.push({
    name: 'main-register',
    query: {
      date: selectedTuesdayIso.value,
      q: String(searchText.value ?? '').trim() || undefined,
    },
  })
}

const handleSearchChange = (value) => {
  searchText.value = String(value ?? '')
}

const handleSelectTuesday = (value) => {
  setSelectedTuesday(value)
}

watch(
  () => [route.query.date, route.query.q],
  ([dateQuery, searchQuery]) => {
    const nextDate = typeof dateQuery === 'string' ? dateQuery : ''
    const nextSearch = typeof searchQuery === 'string' ? searchQuery : ''

    if (nextDate && nextDate !== selectedTuesdayIso.value) {
      setSelectedTuesday(nextDate)
    }
    if (nextSearch !== searchText.value) {
      searchText.value = nextSearch
    }
  },
  { immediate: true },
)

watch(
  () => [selectedTuesdayIso.value, searchText.value],
  ([date, search]) => {
    const normalizedSearch = String(search ?? '').trim()
    const currentDate = typeof route.query.date === 'string' ? route.query.date : ''
    const currentSearch = typeof route.query.q === 'string' ? route.query.q : ''
    if (currentDate === date && currentSearch === normalizedSearch) return

    router.replace({
      name: 'main',
      query: {
        ...route.query,
        date,
        q: normalizedSearch || undefined,
      },
    })
  },
)
</script>

<template>
  <MainProductionPlanView
    :page-title="pageTitle"
    :week-offset="weekOffset"
    :selected-tuesday-iso="selectedTuesdayIso"
    :search-text="searchText"
    :plan-loading="planLoading"
    :plan-error="planError"
    :grouped-rows="groupedRows"
    @move-week="moveWeek"
    @reset-week="resetWeek"
    @go-register="goRegister"
    @search-change="handleSearchChange"
    @select-tuesday="handleSelectTuesday"
  />
</template>

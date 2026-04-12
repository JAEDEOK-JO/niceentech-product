<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/features/quality-list/quality.css'
import QualityForm from '@/features/quality-list/components/QualityForm.vue'
import { formatQualityDate, getNextTuesday } from '@/features/quality-list/utils/date'

const route = useRoute()
const router = useRouter()

const initialDate = computed(() => {
  const queryValue = route.query.testDate
  return typeof queryValue === 'string' && queryValue.trim()
    ? queryValue
    : formatQualityDate(getNextTuesday(new Date()))
})

function handleSaved() {
  void router.push({
    name: 'quality-list',
    query: {
      testDate: typeof route.query.testDate === 'string' ? route.query.testDate : undefined,
    },
  })
}

function handleCancel() {
  void router.push({
    name: 'quality-list',
    query: {
      testDate: typeof route.query.testDate === 'string' ? route.query.testDate : undefined,
    },
  })
}
</script>

<template>
  <div class="page-shell">
    <QualityForm mode="create" :initial-date="initialDate" @saved="handleSaved" @cancel="handleCancel" />
  </div>
</template>

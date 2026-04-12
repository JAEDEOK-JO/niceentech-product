<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/features/quality-list/quality.css'
import QualityForm from '@/features/quality-list/components/QualityForm.vue'
import { buildFormFromRow, fetchQualityItem } from '@/features/quality-list/services/quality.service'
import type { QualityFormState } from '@/features/quality-list/types/quality'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const form = ref<QualityFormState | null>(null)

const id = computed(() => Number(route.params.id))

async function load() {
  loading.value = true
  try {
    const item = await fetchQualityItem(id.value)
    form.value = item ? buildFormFromRow(item) : null
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '수정 데이터를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

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

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="page-shell">
    <div v-if="loading" class="empty-panel">데이터를 불러오는 중입니다.</div>
    <div v-else-if="!form" class="empty-panel">대상 항목을 찾을 수 없습니다.</div>
    <QualityForm v-else mode="update" :initial-date="form.testDate" :initial-value="form" @saved="handleSaved" @cancel="handleCancel" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/features/quality-list/quality.css'
import {
  buildCountBreakdown,
  fetchQualityItem,
  saveCountBreakdown,
} from '@/features/quality-list/services/quality.service'
import type { QualityCountBreakdown, QualityListRow } from '@/features/quality-list/types/quality'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const row = ref<QualityListRow | null>(null)

const breakdown = reactive<QualityCountBreakdown>({
  a32: [0, 0, 0, 0, 0, 0],
  a40: [0, 0, 0, 0, 0, 0],
  a50: [0, 0, 0, 0, 0, 0],
  a65: [0, 0, 0, 0, 0, 0],
})

const id = computed(() => Number(route.params.id))

function total(values: number[]) {
  return values.reduce((sum, value) => sum + Number(value || 0), 0)
}

async function load() {
  loading.value = true
  try {
    const item = await fetchQualityItem(id.value)
    row.value = item
    if (item) {
      const next = buildCountBreakdown(item)
      breakdown.a32 = [...next.a32]
      breakdown.a40 = [...next.a40]
      breakdown.a50 = [...next.a50]
      breakdown.a65 = [...next.a65]
    }
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '수량 점검 데이터를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function save(finalSave: boolean) {
  if (!row.value) return

  try {
    await saveCountBreakdown(row.value, breakdown, finalSave)
    window.alert(finalSave ? '최종 확인이 저장되었습니다.' : '중간 저장되었습니다.')
    void router.back()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '저장에 실패했습니다.')
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="page-shell">
    <div v-if="loading" class="empty-panel">데이터를 불러오는 중입니다.</div>
    <div v-else-if="!row" class="empty-panel">대상 항목을 찾을 수 없습니다.</div>
    <section v-else class="card-section">
      <div class="form-header">
        <div>
          <h2>{{ row.company }} {{ row.place }}</h2>
          <p>{{ row.area }}</p>
        </div>
        <div class="form-actions">
          <button type="button" class="ghost-button" @click="router.back()">닫기</button>
          <button type="button" class="ghost-button" @click="save(false)">중간 저장</button>
          <button type="button" class="primary-button" @click="save(true)">
            {{ row.total ? '수량 맞음' : '최종 확인' }}
          </button>
        </div>
      </div>

      <div class="count-check-head">
        <div>32A {{ row.a32 }}</div>
        <div>40A {{ row.a40 }}</div>
        <div>50A {{ row.a50 }}</div>
        <div>65A {{ row.a65 }}</div>
      </div>

      <table class="quality-table">
        <thead>
          <tr>
            <th>다발</th>
            <th>32A</th>
            <th>40A</th>
            <th>50A</th>
            <th>65A</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="index in 6" :key="index">
            <td>{{ index }}번 다발</td>
            <td><input v-model.number="breakdown.a32[index - 1]" type="number" min="0" /></td>
            <td><input v-model.number="breakdown.a40[index - 1]" type="number" min="0" /></td>
            <td><input v-model.number="breakdown.a50[index - 1]" type="number" min="0" /></td>
            <td><input v-model.number="breakdown.a65[index - 1]" type="number" min="0" /></td>
          </tr>
          <tr>
            <th>합계</th>
            <th>{{ total(breakdown.a32) }}</th>
            <th>{{ total(breakdown.a40) }}</th>
            <th>{{ total(breakdown.a50) }}</th>
            <th>{{ total(breakdown.a65) }}</th>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

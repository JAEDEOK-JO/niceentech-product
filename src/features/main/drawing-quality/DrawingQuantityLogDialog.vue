<script setup>
import { ref, watch } from 'vue'
import { fetchQuantityRunLogs, quantityLogStatus } from '@/features/main/drawing-quality/fetchQuantityRunLogs'

const props = defineProps({
  open: { type: Boolean, default: false },
  testDate: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const rows = ref([])

watch(
  () => [props.open, props.testDate],
  async ([open]) => {
    if (!open) return
    rows.value = []
    try {
      rows.value = await fetchQuantityRunLogs(props.testDate)
    } catch {
      rows.value = []
    }
  },
)

function statusClass(state) {
  if (state === 'failed') return 'text-red-600'
  if (state === 'done' || state === 'review') return 'text-emerald-700'
  return 'text-sky-700'
}
</script>

<template>
  <div v-if="open" class="log-overlay" @click.self="emit('close')">
    <div class="log-box">
      <div class="log-head">
        <p class="log-title">수량파악</p>
        <button type="button" class="log-close" @click="emit('close')">닫기</button>
      </div>
      <div class="log-scroll">
        <p v-if="rows.length === 0" class="log-empty">없음</p>
        <div v-else class="log-list">
          <div class="log-row log-columns">
            <span>도번</span>
            <span>회사명</span>
            <span>현장명</span>
            <span>구역명</span>
            <span>상태</span>
          </div>
          <article v-for="row in rows" :key="row.id" class="log-item">
            <div class="log-row">
              <span class="log-no">{{ row.drawing_no }}</span>
              <span>{{ row.company }}</span>
              <span>{{ row.place }}</span>
              <span>{{ row.area }}</span>
              <span class="log-status" :class="statusClass(row.state)">{{ quantityLogStatus(row.state) }}</span>
            </div>
            <p v-if="row.result_message" class="log-reason">{{ row.result_message }}</p>
          </article>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  padding: 16px;
}

.log-box {
  display: flex;
  width: min(1120px, 100%);
  max-height: min(80vh, 760px);
  flex-direction: column;
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
}

.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.log-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.log-close {
  padding: 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

.log-scroll {
  min-height: 0;
  margin-top: 14px;
  overflow: auto;
}

.log-columns,
.log-row {
  display: grid;
  grid-template-columns: 88px 148px minmax(200px, 1.5fr) minmax(160px, 1fr) 52px;
  column-gap: 16px;
  align-items: start;
}

.log-columns {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0 2px 8px;
  background: #fff;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.log-item {
  padding: 10px 2px;
  border-top: 1px solid #e2e8f0;
}

.log-row {
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.log-no,
.log-status {
  white-space: nowrap;
}

.log-status {
  font-weight: 800;
}

.log-reason {
  margin: 6px 0 2px 104px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.55;
  white-space: pre-line;
}

.log-empty {
  margin: 0;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
</style>

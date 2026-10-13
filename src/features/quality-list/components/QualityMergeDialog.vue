<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { vVirtualKeyboard } from '@/features/virtual-keyboard/directives/vVirtualKeyboard'
import type { QualityListRow } from '@/features/quality-list/types/quality'

const COUNT_FIELDS = [
  { key: 'a32', label: '32A' },
  { key: 'a40', label: '40A' },
  { key: 'a50', label: '50A' },
  { key: 'a65', label: '65A' },
  { key: 'm65', label: '65A' },
  { key: 'm80', label: '80A' },
  { key: 'm100', label: '100A' },
  { key: 'm125', label: '125A' },
  { key: 'm150', label: '150A' },
  { key: 'm200', label: '200A' },
] as const

const props = defineProps<{
  open: boolean
  items: QualityListRow[]
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [rows: QualityListRow[], payload: { initial: string; area: string }]
}>()

const step = ref<'pick' | 'form'>('pick')
const checkedIds = ref<number[]>([])
const initial = ref('')
const area = ref('')

function siteKey(row: QualityListRow) {
  return `${row.company}\0${row.place}`
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    step.value = 'pick'
    checkedIds.value = []
    initial.value = ''
    area.value = ''
  },
)

const groups = computed(() => {
  const grouped = new Map<string, QualityListRow[]>()
  for (const row of props.items) {
    const key = siteKey(row)
    const list = grouped.get(key) ?? []
    list.push(row)
    grouped.set(key, list)
  }
  return [...grouped.entries()]
    .filter(([, rows]) => rows.length >= 2)
    .map(([key, rows]) => ({
      key,
      label: `${rows[0].company} ${rows[0].place}`.trim(),
      rows,
    }))
})

const checkedRows = computed(() => {
  const selected = new Set(checkedIds.value)
  return props.items.filter((row) => selected.has(row.id))
})

const siteLabel = computed(() => {
  const row = checkedRows.value[0]
  if (!row) return ''
  return `${row.company} ${row.place}`.trim()
})

const sums = computed(() =>
  COUNT_FIELDS.map((field) => ({
    ...field,
    value: checkedRows.value.reduce((sum, row) => sum + Number(row[field.key] ?? 0), 0),
  })).filter((field) => field.value > 0),
)

function joined(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean).join(', ')
}

function toggleRow(row: QualityListRow) {
  if (props.busy) return
  const selectedKey = checkedRows.value[0] ? siteKey(checkedRows.value[0]) : ''
  if (selectedKey && selectedKey !== siteKey(row)) {
    checkedIds.value = [row.id]
    return
  }
  checkedIds.value = checkedIds.value.includes(row.id)
    ? checkedIds.value.filter((id) => id !== row.id)
    : [...checkedIds.value, row.id]
}

function goForm() {
  if (checkedRows.value.length < 2) return
  initial.value = joined(checkedRows.value.map((row) => row.initial))
  area.value = joined(checkedRows.value.map((row) => row.area))
  step.value = 'form'
}

function submit() {
  if (props.busy || checkedRows.value.length < 2) return
  emit('confirm', checkedRows.value, { initial: initial.value, area: area.value })
}
</script>

<template>
  <div v-if="open" class="merge-overlay" @click.self="emit('close')">
    <div class="merge-box">
      <div class="merge-head">
        <p class="merge-title">합치기</p>
        <button type="button" class="merge-close" :disabled="busy" @click="emit('close')">닫기</button>
      </div>

      <template v-if="step === 'pick'">
        <div class="merge-list">
          <section v-for="group in groups" :key="group.key" class="merge-group">
            <p class="merge-site">{{ group.label }}</p>
            <label v-for="row in group.rows" :key="row.id" class="merge-check">
              <input
                type="checkbox"
                :checked="checkedIds.includes(row.id)"
                :disabled="busy"
                @change="toggleRow(row)"
              />
              <span>{{ row.initial || '-' }}</span>
              <span>{{ row.area || '-' }}</span>
            </label>
          </section>
        </div>
        <button type="button" class="merge-submit" :disabled="checkedRows.length < 2" @click="goForm">합치기</button>
      </template>

      <template v-else>
        <p class="merge-site">{{ siteLabel }}</p>
        <label class="merge-field">
          <span>도번</span>
          <input v-model="initial" v-virtual-keyboard type="text" :disabled="busy" />
        </label>
        <label class="merge-field">
          <span>구역명</span>
          <input v-model="area" v-virtual-keyboard type="text" :disabled="busy" />
        </label>
        <div v-if="sums.length" class="merge-sums">
          <span v-for="field in sums" :key="field.key">{{ field.label }} {{ field.value }}</span>
        </div>
        <button type="button" class="merge-submit" :disabled="busy" @click="submit">합치기</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.merge-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  padding: 16px;
}

.merge-box {
  display: flex;
  width: 100%;
  max-width: 520px;
  max-height: min(80vh, 720px);
  flex-direction: column;
  padding: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
}

.merge-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.merge-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.merge-close {
  padding: 0;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}

.merge-list {
  min-height: 0;
  margin-top: 14px;
  overflow: auto;
}

.merge-group + .merge-group {
  margin-top: 16px;
}

.merge-site {
  margin: 14px 0 0;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.merge-group .merge-site {
  margin-top: 0;
}

.merge-check {
  display: grid;
  grid-template-columns: 18px minmax(72px, 120px) 1fr;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.merge-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.merge-field input {
  height: 36px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.merge-sums {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.merge-sums span {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
}

.merge-submit {
  width: 100%;
  margin-top: 16px;
  padding: 12px 0;
  border: none;
  border-radius: 10px;
  background: #0f172a;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.merge-submit:disabled,
.merge-close:disabled {
  cursor: default;
  opacity: 0.6;
}
</style>

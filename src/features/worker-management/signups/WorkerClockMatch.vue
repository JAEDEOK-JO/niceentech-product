<script setup>
import { computed, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import { useDialog } from '@/composables/useDialog'
import { saveWorkerClockIds } from './workerClockId'

const { alert, confirm } = useDialog()

const props = defineProps({
  workers: { type: Array, default: () => [] },
})

const emit = defineEmits(['saved'])

const excelEntries = ref([])
const uploadedFileName = ref('')
const uploading = ref(false)
const saving = ref(false)

const normalizeIdCell = (value) => {
  const raw = String(value ?? '').trim()
  const matched = raw.match(/(\d{1,8})/)
  if (!matched) return ''
  return matched[1].padStart(8, '0')
}

const HEADER_PATTERNS = {
  id: [/\bid\b/i, /사번/, /번호/],
  name: [/이름/, /성명/, /^name$/i],
}

const findColumn = (headers, key) => {
  for (let i = 0; i < headers.length; i += 1) {
    const header = String(headers[i] ?? '').trim()
    if (!header) continue
    if (HEADER_PATTERNS[key].some((pattern) => pattern.test(header))) return i
  }
  return -1
}

const detectHeaderRow = (rows) => {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const joined = (rows[i] ?? []).map((cell) => String(cell ?? '')).join('|').toLowerCase()
    let hits = 0
    if (/id|사번/.test(joined)) hits += 1
    if (/이름|성명|name/.test(joined)) hits += 1
    if (/날짜|일자|date/.test(joined)) hits += 1
    if (hits >= 2) return i
  }
  return 0
}

async function handleFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = true
  uploadedFileName.value = file.name
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false })
    if (rows.length === 0) {
      await alert('엑셀 파일이 비어있습니다.')
      return
    }
    const headerIndex = detectHeaderRow(rows)
    const headers = (rows[headerIndex] ?? []).map((cell) => String(cell ?? '').trim())
    const idColumn = findColumn(headers, 'id')
    const nameColumn = findColumn(headers, 'name')
    if (idColumn < 0) {
      await alert('ID 컬럼을 찾지 못했습니다.')
      return
    }
    const unique = new Map()
    for (const row of rows.slice(headerIndex + 1)) {
      const code = normalizeIdCell(row?.[idColumn])
      if (!code) continue
      const name = String(nameColumn >= 0 ? row?.[nameColumn] ?? '' : '').trim()
      const current = unique.get(code)
      if (current) {
        current.rowCount += 1
        if (!current.rawName && name) current.rawName = name
      } else {
        unique.set(code, { employeeCode: code, rawName: name, rowCount: 1 })
      }
    }
    excelEntries.value = [...unique.values()].sort((left, right) => left.employeeCode.localeCompare(right.employeeCode))
    if (excelEntries.value.length === 0) await alert('엑셀에서 ID를 추출하지 못했습니다.')
  } catch (error) {
    await alert(error?.message || '엑셀 파싱 실패')
  } finally {
    uploading.value = false
  }
}

const normalizeName = (value) => String(value ?? '').replace(/\s+/g, '').toLowerCase()

const proposals = computed(() => {
  const assigned = new Set(props.workers.map((worker) => worker.employee_code).filter(Boolean))
  const openWorkers = props.workers.filter((worker) => !worker.employee_code)
  return excelEntries.value
    .filter((entry) => !assigned.has(entry.employeeCode))
    .map((entry) => {
      const needle = normalizeName(entry.rawName)
      let suggestedId = ''
      if (needle) {
        const match = openWorkers.find((worker) => {
          const name = normalizeName(worker.name)
          return name && (name === needle || name.includes(needle) || needle.includes(name))
        })
        suggestedId = match?.id ?? ''
      }
      return { ...entry, suggestedId }
    })
})

const selections = ref(new Map())

watch(proposals, (list) => {
  const next = new Map()
  for (const proposal of list) {
    const previous = selections.value.get(proposal.employeeCode)
    next.set(proposal.employeeCode, previous !== undefined ? previous : proposal.suggestedId)
  }
  selections.value = next
}, { immediate: true })

function choices(code) {
  const selectedId = selections.value.get(code)
  const used = new Set([...selections.value.entries()].filter(([key, id]) => key !== code && id).map(([, id]) => id))
  return props.workers.filter((worker) => !worker.employee_code && (worker.id === selectedId || !used.has(worker.id)))
}

const selectedCount = computed(() => [...selections.value.values()].filter(Boolean).length)

function choose(code, value) {
  const next = new Map(selections.value)
  next.set(code, value)
  selections.value = next
}

async function save() {
  const updates = proposals.value
    .map((proposal) => ({ id: selections.value.get(proposal.employeeCode), employeeCode: proposal.employeeCode }))
    .filter((row) => row.id)
  if (updates.length === 0) {
    await alert('매칭할 직원을 선택해주세요.')
    return
  }
  if (!(await confirm(`${updates.length}명에 사번을 저장할까요?`, { confirmText: '저장' }))) return
  saving.value = true
  try {
    await saveWorkerClockIds(updates)
    excelEntries.value = []
    uploadedFileName.value = ''
    emit('saved')
  } catch (error) {
    await alert(error?.message || '저장에 실패했습니다.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mb-4 grid gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <label class="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white">
        {{ uploading ? '분석 중' : '엑셀' }}
        <input type="file" accept=".xlsx,.xls,.csv" class="hidden" :disabled="uploading" @change="handleFile" />
      </label>
      <button
        v-if="excelEntries.length"
        type="button"
        class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
        @click="excelEntries = []"
      >
        비우기
      </button>
      <p v-if="uploadedFileName" class="text-xs font-bold text-slate-500">{{ uploadedFileName }}</p>
    </div>
    <div v-if="proposals.length" class="overflow-x-auto rounded-xl border border-slate-200">
      <div class="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <p class="text-sm font-extrabold text-slate-900">매칭 {{ proposals.length }}</p>
        <button
          type="button"
          class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-40"
          :disabled="saving || selectedCount === 0"
          @click="save"
        >
          {{ saving ? '저장 중' : '저장' }}
        </button>
      </div>
      <table class="min-w-full border-collapse text-sm">
        <thead>
          <tr class="bg-slate-50 text-center text-xs font-bold text-slate-500">
            <th class="border border-slate-200 px-3 py-2">사번</th>
            <th class="border border-slate-200 px-3 py-2">엑셀 이름</th>
            <th class="border border-slate-200 px-3 py-2">직원</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="proposal in proposals" :key="proposal.employeeCode">
            <td class="border border-slate-200 px-3 py-2 text-center font-mono">{{ proposal.employeeCode }}</td>
            <td class="border border-slate-200 px-3 py-2 text-center">{{ proposal.rawName || '-' }}</td>
            <td class="border border-slate-200 px-3 py-2">
              <select
                :value="selections.get(proposal.employeeCode) ?? ''"
                class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5"
                @change="choose(proposal.employeeCode, $event.target.value)"
              >
                <option value="">-</option>
                <option v-for="worker in choices(proposal.employeeCode)" :key="worker.id" :value="worker.id">
                  {{ worker.name }}
                </option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

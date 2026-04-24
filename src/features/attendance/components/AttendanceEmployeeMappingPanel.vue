<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import * as XLSX from 'xlsx'
import { useDialog } from '@/composables/useDialog'
import { assignEmployeeCodesBulk } from '../services/attendance.service'
import type { Employee } from '../types/attendance'

const { alert, confirm } = useDialog()

const props = defineProps<{
  employees: Employee[]
}>()

const emit = defineEmits<{
  (e: 'refreshEmployees'): void
}>()

interface ExcelEntry {
  employeeCode: string
  rawName: string
  rowCount: number
}

interface MatchProposal {
  employeeCode: string
  rawName: string
  rowCount: number
  suggestedEmployeeId: number | null
}

const excelEntries = ref<ExcelEntry[]>([])
const uploadedFileName = ref('')
const uploading = ref(false)
const savingMapping = ref(false)

// ─── 엑셀 파싱 (ID + 이름만 추출) ──────────────────────────────────────────────
const normalizeIdCell = (value: unknown): string => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const matched = raw.match(/(\d{1,8})/)
  if (!matched) return ''
  return matched[1].padStart(8, '0')
}

const HEADER_PATTERNS = {
  id: [/\bid\b/i, /사번/, /번호/],
  name: [/이름/, /성명/, /^name$/i],
} as const
type HeaderKey = keyof typeof HEADER_PATTERNS

const findColumn = (headers: string[], key: HeaderKey): number => {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] ?? '').trim()
    if (!h) continue
    for (const pat of HEADER_PATTERNS[key]) if (pat.test(h)) return i
  }
  return -1
}

const detectHeaderRow = (aoa: unknown[][]): number => {
  for (let i = 0; i < Math.min(aoa.length, 20); i++) {
    const row = aoa[i]
    if (!row) continue
    const joined = row.map((c) => String(c ?? '')).join('|').toLowerCase()
    let hits = 0
    if (/id|사번/.test(joined)) hits++
    if (/이름|성명|name/.test(joined)) hits++
    if (/날짜|일자|date/.test(joined)) hits++
    if (hits >= 2) return i
  }
  return 0
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  uploadedFileName.value = file.name

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    })
    if (aoa.length === 0) {
      await alert('엑셀 파일이 비어있습니다.')
      return
    }

    const headerRowIdx = detectHeaderRow(aoa)
    const headers = (aoa[headerRowIdx] ?? []).map((c) => String(c ?? '').trim())
    const idCol = findColumn(headers, 'id')
    const nameCol = findColumn(headers, 'name')
    if (idCol < 0) {
      await alert(`ID 컬럼을 찾지 못했습니다.\n감지된 헤더: ${headers.join(', ')}`)
      return
    }

    const uniq = new Map<string, ExcelEntry>()
    for (let i = headerRowIdx + 1; i < aoa.length; i++) {
      const row = aoa[i]
      if (!row) continue
      const code = normalizeIdCell(row[idCol])
      if (!code) continue
      const name = String(nameCol >= 0 ? row[nameCol] ?? '' : '').trim()
      const existing = uniq.get(code)
      if (existing) {
        existing.rowCount++
        if (!existing.rawName && name) existing.rawName = name
      } else {
        uniq.set(code, { employeeCode: code, rawName: name, rowCount: 1 })
      }
    }
    excelEntries.value = [...uniq.values()].sort((a, b) =>
      a.employeeCode.localeCompare(b.employeeCode),
    )
    if (excelEntries.value.length === 0) {
      await alert('엑셀에서 ID를 추출하지 못했습니다.')
    }
  } catch (err) {
    console.error(err)
    await alert(`엑셀 파싱 실패: ${(err as Error).message}`)
  } finally {
    uploading.value = false
    target.value = ''
  }
}

// ─── 매칭 제안 ─────────────────────────────────────────────────────────────────
const normalizeForMatch = (s: string) => s.replace(/\s+/g, '').toLowerCase()

const matchProposals = computed<MatchProposal[]>(() => {
  const assignedCodes = new Set(
    props.employees.map((e) => e.employeeCode).filter(Boolean) as string[],
  )
  const unassigned = props.employees.filter((e) => !e.employeeCode)
  const result: MatchProposal[] = []

  for (const entry of excelEntries.value) {
    if (assignedCodes.has(entry.employeeCode)) continue // 이미 등록된 ID는 제외
    const needle = normalizeForMatch(entry.rawName)
    let best: { emp: Employee; score: number } | null = null
    if (needle) {
      for (const emp of unassigned) {
        const hay = normalizeForMatch(emp.name)
        if (!hay) continue
        let score = 0
        if (hay === needle) score = 100
        else if (hay.includes(needle)) score = 80
        else if (needle.includes(hay)) score = 70
        if (score > 0 && (!best || score > best.score)) best = { emp, score }
      }
    }
    result.push({
      employeeCode: entry.employeeCode,
      rawName: entry.rawName,
      rowCount: entry.rowCount,
      suggestedEmployeeId: best?.emp.id ?? null,
    })
  }
  return result
})

const proposalSelections = ref<Map<string, number | null>>(new Map())

watch(
  matchProposals,
  (list) => {
    const next = new Map<string, number | null>()
    for (const p of list) {
      const prev = proposalSelections.value.get(p.employeeCode)
      next.set(p.employeeCode, prev !== undefined ? prev : p.suggestedEmployeeId)
    }
    proposalSelections.value = next
  },
  { immediate: true },
)

const availableEmployeesFor = (code: string) => {
  const selectedId = proposalSelections.value.get(code)
  const usedIds = new Set<number>()
  for (const [c, id] of proposalSelections.value) {
    if (c !== code && id != null) usedIds.add(id)
  }
  return props.employees.filter(
    (e) => !e.employeeCode && (e.id === selectedId || !usedIds.has(e.id)),
  )
}

const selectedMappingCount = computed(() => {
  let n = 0
  for (const id of proposalSelections.value.values()) if (id != null) n++
  return n
})

const alreadyAssignedCount = computed(
  () => excelEntries.value.length - matchProposals.value.length,
)

const saveMappings = async () => {
  const updates: Array<{ id: number; employeeCode: string; name?: string }> = []
  for (const p of matchProposals.value) {
    const sel = proposalSelections.value.get(p.employeeCode)
    if (sel != null) {
      updates.push({
        id: sel,
        employeeCode: p.employeeCode,
        name: p.rawName || undefined,
      })
    }
  }
  if (updates.length === 0) {
    await alert('매칭할 직원을 선택해주세요.')
    return
  }
  if (!(await confirm(`${updates.length}명에 ID와 엑셀 이름(풀네임)을 저장할까요?`))) return

  savingMapping.value = true
  try {
    await assignEmployeeCodesBulk(updates)
    await alert(`${updates.length}명 저장 완료.`)
    excelEntries.value = []
    uploadedFileName.value = ''
    emit('refreshEmployees')
  } catch (err) {
    await alert(`저장 실패: ${(err as Error).message}`)
  } finally {
    savingMapping.value = false
  }
}

const clearAll = () => {
  excelEntries.value = []
  uploadedFileName.value = ''
  proposalSelections.value = new Map()
}
</script>

<template>
  <div class="space-y-4">
    <!-- 업로드 -->
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">엑셀 업로드</p>
          <p class="mt-1 text-sm text-slate-600">
            근태 엑셀을 올리면 ID ↔ 직원을 자동 매칭합니다. (최초 1회)
          </p>
        </div>
        <div class="flex items-center gap-2">
          <label class="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
            {{ uploading ? '분석 중...' : '엑셀 파일 선택' }}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              class="hidden"
              :disabled="uploading"
              @change="handleFileUpload"
            />
          </label>
          <button
            v-if="excelEntries.length > 0"
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
            @click="clearAll"
          >비우기</button>
        </div>
      </div>
      <p v-if="uploadedFileName" class="mt-2 text-xs font-semibold text-slate-600">
        파일: <span class="font-mono">{{ uploadedFileName }}</span> ·
        추출 ID {{ excelEntries.length }}개 (이미 매칭됨 {{ alreadyAssignedCount }}, 신규 {{ matchProposals.length }})
      </p>
    </div>

    <!-- 매칭 제안 -->
    <div v-if="matchProposals.length > 0" class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-bold text-amber-900">
          신규 매칭 {{ matchProposals.length }}건
        </p>
        <button
          type="button"
          class="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-40"
          :disabled="savingMapping || selectedMappingCount === 0"
          @click="saveMappings"
        >
          {{ savingMapping ? '저장 중...' : `${selectedMappingCount}명 매칭 저장` }}
        </button>
      </div>
      <div class="mt-3 overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b border-amber-200 bg-amber-100/60">
              <th class="border-r border-amber-200 px-3 py-2 text-center font-bold text-amber-900">ID</th>
              <th class="border-r border-amber-200 px-3 py-2 text-center font-bold text-amber-900">엑셀 이름 (풀네임)</th>
              <th class="border-r border-amber-200 px-3 py-2 text-center font-bold text-amber-900">행수</th>
              <th class="px-3 py-2 text-center font-bold text-amber-900">매칭할 직원</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in matchProposals"
              :key="p.employeeCode"
              class="border-b border-amber-100 last:border-0"
            >
              <td class="border-r border-amber-100 px-3 py-2 text-center font-mono text-xs font-bold text-amber-900">{{ p.employeeCode }}</td>
              <td class="border-r border-amber-100 px-3 py-2 text-center text-slate-800">{{ p.rawName || '-' }}</td>
              <td class="border-r border-amber-100 px-3 py-2 text-center text-xs text-slate-600">{{ p.rowCount }}</td>
              <td class="px-3 py-2">
                <select
                  :value="proposalSelections.get(p.employeeCode) ?? ''"
                  class="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  @change="proposalSelections.set(p.employeeCode, ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
                >
                  <option value="">— 건너뛰기 —</option>
                  <option
                    v-for="emp in availableEmployeesFor(p.employeeCode)"
                    :key="emp.id"
                    :value="emp.id"
                  >
                    {{ emp.name }}{{ emp.department ? ` (${emp.department})` : '' }}
                    {{ emp.id === p.suggestedEmployeeId ? ' ⭐ 추천' : '' }}
                  </option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p
      v-else-if="excelEntries.length > 0"
      class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700"
    >
      추출된 모든 ID가 이미 직원목록에 등록되어 있습니다. 매칭할 항목이 없습니다.
    </p>
  </div>
</template>

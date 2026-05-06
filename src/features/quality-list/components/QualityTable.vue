<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { QualityCountField } from '../services/quality.service'
import type { QualityListRow } from '../types/quality'

const props = defineProps<{
  items: QualityListRow[]
  loading?: boolean
  showAllRecords?: boolean
}>()

function formatShortDate(testDate: string): string {
  // "2026년 01월 03일" → "(26년01월03일)"
  const compact = testDate.replace(/\s/g, '')
  return compact.length >= 2 ? `(${compact.slice(2)})` : ''
}

const emit = defineEmits<{
  edit: [item: QualityListRow]
  delete: [item: QualityListRow]
  notification: [item: QualityListRow]
  stamp: [item: QualityListRow]
  updateCancel: [item: QualityListRow, field: QualityCountField, value: number]
  updateRange: [item: QualityListRow, lotStart: number]
}>()

const rangeInputs = ref<Record<number, string>>({})
const expandedCards = ref<Record<number, boolean>>({})

watch(
  () => props.items,
  (items) => {
    const currentIds = new Set(items.map((item) => item.id))
    const next: Record<number, string> = {}
    for (const item of items) {
      const existing = rangeInputs.value[item.id]
      next[item.id] = existing !== undefined ? existing : String(item.lotNumStartH ?? '')
    }
    for (const id of Object.keys(rangeInputs.value)) {
      if (!currentIds.has(Number(id))) continue
    }
    rangeInputs.value = next
  },
  { immediate: true },
)

function saveRange(item: QualityListRow) {
  const val = Number.parseInt(rangeInputs.value[item.id] ?? '', 10)
  emit('updateRange', item, Number.isFinite(val) ? val : 0)
}

const menuDialogItem = ref<QualityListRow | null>(null)
function openMenuDialog(item: QualityListRow) { menuDialogItem.value = item }
function closeMenuDialog() { menuDialogItem.value = null }

function toggleCard(item: QualityListRow) {
  expandedCards.value = {
    ...expandedCards.value,
    [item.id]: !expandedCards.value[item.id],
  }
}

function isCardExpanded(item: QualityListRow) {
  return Boolean(expandedCards.value[item.id])
}

const total = computed(() =>
  props.items.reduce(
    (sum, item) => sum + item.a32 + item.a40 + item.a50 + item.a65 + item.m65 + item.m80 + item.m100 + item.m125 + item.m150 + item.m200,
    0,
  ),
)

function lotRoundClass(round: string) {
  if (round === '1차') return 'round-1'
  if (round === '2차') return 'round-2'
  if (round === '3차') return 'round-3'
  if (round === '4차') return 'round-4'
  return ''
}

function promptCancel(item: QualityListRow, field: QualityCountField, currentValue: number) {
  const input = window.prompt(`${field.toUpperCase()} 반납 수량`, String(currentValue))
  if (input == null) return
  const next = Number.parseInt(input, 10)
  emit('updateCancel', item, field, Number.isFinite(next) ? next : 0)
}

interface CountCol {
  label: string
  field: QualityCountField
  valueKey: keyof QualityListRow
  cancelKey: keyof QualityListRow
  metric: boolean
}

const countCols: CountCol[] = [
  { label: '32A',  field: 'a32',  valueKey: 'a32',  cancelKey: 'a32Cancel',  metric: false },
  { label: '40A',  field: 'a40',  valueKey: 'a40',  cancelKey: 'a40Cancel',  metric: false },
  { label: '50A',  field: 'a50',  valueKey: 'a50',  cancelKey: 'a50Cancel',  metric: false },
  { label: '65A',  field: 'a65',  valueKey: 'a65',  cancelKey: 'a65Cancel',  metric: false },
  { label: '65A',  field: 'm65',  valueKey: 'm65',  cancelKey: 'm65Cancel',  metric: true  },
  { label: '80A',  field: 'm80',  valueKey: 'm80',  cancelKey: 'm80Cancel',  metric: true  },
  { label: '100A', field: 'm100', valueKey: 'm100', cancelKey: 'm100Cancel', metric: true  },
  { label: '125A', field: 'm125', valueKey: 'm125', cancelKey: 'm125Cancel', metric: true  },
  { label: '150A', field: 'm150', valueKey: 'm150', cancelKey: 'm150Cancel', metric: true  },
  { label: '200A', field: 'm200', valueKey: 'm200', cancelKey: 'm200Cancel', metric: true  },
]

const mobileCountRows: CountCol[][] = [
  countCols.filter((col) => ['a32', 'a40', 'a50', 'a65'].includes(col.field)),
  countCols.filter((col) => ['m80', 'm100', 'm125', 'm150', 'm200'].includes(col.field)),
]
</script>

<template>
  <section class="qt-wrap">
    <div class="qt-summary">
      <span />
      <strong>총합 : {{ total }}개</strong>
    </div>

    <div v-if="loading" class="qt-empty">로딩 중...</div>
    <div v-else-if="items.length === 0" class="qt-empty">검수리스트가 없습니다.</div>
    <div v-else class="qt-list">
      <div class="qt-mobile-cards">
        <article
          v-for="(item, index) in items"
          :key="item.id"
          class="qt-card"
          :class="{ 'qt-card--open': isCardExpanded(item) }"
          @click="toggleCard(item)"
        >
          <div class="qt-card-head">
            <div class="qt-card-title">
              <span class="qt-card-index">No. {{ index + 1 }}</span>
              <strong>{{ item.company }} {{ item.place }}</strong>
              <span v-if="item.area">{{ item.area }}</span>
              <span v-if="showAllRecords && item.testDate" class="qt-card-date">{{ formatShortDate(item.testDate) }}</span>
            </div>
          </div>

          <div class="qt-card-meta">
            <span>도번 {{ item.initial || '-' }}</span>
            <span>합계 {{ item.totalH || 0 }}</span>
          </div>

          <div class="qt-card-lot" :class="lotRoundClass(item.lotRound)" @click.stop>
            <span class="qt-card-lot-name">{{ item.lotNameH || '-' }}</span>
            <span class="qt-card-lot-num">({{ item.lotNumH ? String(item.lotNumH).slice(-3) : '---' }})</span>
            <span class="qt-card-lot-start">{{ rangeInputs[item.id] || 0 }}</span>
            <span>~ {{ item.lotNumEndH || '' }}</span>
          </div>

          <div class="qt-card-toggle">
            <span>수량정보</span>
            <svg viewBox="0 0 24 24" class="qt-card-chevron" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>

          <div class="qt-card-counts">
            <div v-for="(row, rowIndex) in mobileCountRows" :key="rowIndex" class="qt-card-count-row">
              <button
                v-for="col in row"
                :key="col.field"
                type="button"
                class="qt-card-count"
                :class="col.metric ? 'qt-card-count--metric' : 'qt-card-count--inch'"
                @click.stop="promptCancel(item, col.field, item[col.cancelKey] as number)"
              >
                <span>{{ col.label }}</span>
                <strong>{{ (item[col.valueKey] as number) || '-' }}</strong>
              </button>
            </div>
          </div>
        </article>
      </div>

      <div class="qt-scroll">
        <table class="qt">
        <colgroup>
          <col class="col-n" />
          <col class="col-initial" />
          <col class="col-place" />
          <col class="col-lot" />
          <col v-for="col in countCols" :key="col.field" class="col-count" />
          <col class="col-total" />
          <col class="col-menu" />
        </colgroup>
        <thead>
          <tr>
            <th class="th-base">N</th>
            <th class="th-base">도번</th>
            <th class="th-base">현장명</th>
            <th class="th-base">확관</th>
            <th v-for="col in countCols" :key="col.field" :class="col.metric ? 'th-metric' : 'th-inch'">{{ col.label }}</th>
            <th class="th-base">합계</th>
            <th class="th-base">메뉴</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="item.id">
            <td class="td-center">{{ index + 1 }}</td>
            <td class="td-center td-initial">{{ item.initial }}</td>
            <td class="td-center td-place">
              {{ item.company }} {{ item.place }}{{ item.area ? ' ' + item.area : '' }}
              <span v-if="showAllRecords && item.testDate" class="place-date">{{ formatShortDate(item.testDate) }}</span>
            </td>
            <td class="td-lot">
              <div class="lot-inner" :class="lotRoundClass(item.lotRound)">
                <span class="lot-num">({{ item.lotNumH ? String(item.lotNumH).slice(-3) : '---' }})</span>
                <span class="lot-name">{{ item.lotNameH || '-' }}</span>
                <input
                  v-model="rangeInputs[item.id]"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  class="lot-input"
                  @keydown.enter="saveRange(item)"
                  @keydown="(e) => ['e','E','+','-','.'].includes(e.key) && e.preventDefault()"
                />
                <span class="lot-end">~ {{ item.lotNumEndH || '' }}</span>
              </div>
            </td>
            <td
              v-for="col in countCols"
              :key="col.field"
              class="td-center td-count"
              :class="col.metric ? 'td-count--metric' : 'td-count--inch'"
            >
              <button
                v-if="(item[col.cancelKey] as number) > 0 || (item[col.valueKey] as number) > 0"
                type="button"
                class="count-btn"
                @click="promptCancel(item, col.field, item[col.cancelKey] as number)"
              >
                {{ (item[col.valueKey] as number) || '' }}
              </button>
              <span v-else class="count-empty" />
            </td>
            <td class="td-center td-total">{{ item.totalH || '' }}</td>
            <td class="td-center">
              <button type="button" class="menu-txt-btn" @click="openMenuDialog(item)">메뉴</button>
            </td>
          </tr>
        </tbody>
        </table>
      </div>
    </div>

    <!-- 메뉴 다이얼로그 -->
    <div v-if="menuDialogItem" class="dialog-overlay" @click.self="closeMenuDialog">
      <div class="dialog-box">
        <div class="dialog-header">
          <div>
            <p class="dialog-company">{{ menuDialogItem.company }} {{ menuDialogItem.place }}</p>
            <p v-if="menuDialogItem.area" class="dialog-area">{{ menuDialogItem.area }}</p>
          </div>
          <button type="button" class="dialog-close" @click="closeMenuDialog">닫기</button>
        </div>
        <div class="dialog-actions">
          <button type="button" class="da-btn da-btn--blue" @click="emit('edit', menuDialogItem); closeMenuDialog()">수정</button>
          <button type="button" class="da-btn da-btn--green" @click="emit('notification', menuDialogItem); closeMenuDialog()">통보서</button>
          <button type="button" class="da-btn da-btn--purple" @click="emit('stamp', menuDialogItem); closeMenuDialog()">증지</button>
          <button type="button" class="da-btn da-btn--danger" @click="emit('delete', menuDialogItem); closeMenuDialog()">삭제</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ── 레이아웃 ── */
.qt-wrap { display: flex; flex-direction: column; gap: 10px; }

.qt-summary {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  font-size: 23px;
  font-weight: 700;
  color: #1e293b;
}

.qt-empty {
  padding: 56px 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 15px;
}

.qt-list {
  min-width: 0;
}

.qt-mobile-cards {
  display: none;
}

.qt-scroll {
  overflow: auto;
  max-height: calc(100vh - 200px);
}

/* ── 테이블 ── */
.qt {
  width: 100%;
  min-width: 900px;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 15px;
  background: #fff;
}

/* colgroup widths — table-layout:fixed 이므로 비율대로 적용됨 */
.col-n       { width: 32px;  }
.col-initial { width: 41px;  }
.col-place   { width: 218px; }
.col-lot     { width: 140px; }
.col-count   { width: 37px;  }
.col-total   { width: 41px;  }
.col-menu    { width: 22px;  }

.qt th, .qt td {
  border-right: 1px solid #94a3b8;
  border-bottom: 1px solid #94a3b8;
  padding: 0;
  vertical-align: middle;
  text-align: center;
}

.qt th:first-child, .qt td:first-child {
  border-left: 1px solid #94a3b8;
}

/* 헤더 공통 */
.qt thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  color: #1e3a8a;
  font-weight: 700;
  font-size: 15px;
  height: 40px;
  padding: 0 4px;
  white-space: nowrap;
  border-top: 1px solid #94a3b8;
  border-right: 1px solid #64748b;
  border-bottom: 2px solid #475569;
}

/* N·도번·현장명·확관·합계·메뉴 — 두 단계 연하게 */
.qt thead th.th-base   { background: #eff6ff; }
/* 32A~65A — 한 단계 연하게 */
.qt thead th.th-inch   { background: #dbeafe; }
/* M65~M200 — 연한 딥오렌지 */
.qt thead th.th-metric { background: #ffedd5; color: #7c2d12; }

/* 바디 행 높이 */
.qt tbody tr { height: 64px; }

/* 기본 td */
.td-center { padding: 10px 4px; }

.td-initial {
  font-size: 14px;
  color: #334155;
  font-weight: 600;
  padding: 6px 4px;
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
}

/* 현장명 — 헤더 제외 바디 셀만 왼쪽 정렬 */
.qt tbody .td-place {
  white-space: normal;
  word-break: keep-all;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  padding: 10px 8px;
  line-height: 1.5;
  text-align: left;
}

.place-date {
  margin-left: 4px;
  font-size: 15px;
  font-weight: 600;
  color: #ea580c;
  white-space: nowrap;
}

/* 확관 */
.td-lot {
  padding: 0 4px;
  vertical-align: middle;
}
.lot-inner {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 3px;
  white-space: nowrap;
}
.lot-num {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  flex-shrink: 0;
}
.lot-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex-shrink: 1;
}
.lot-input {
  width: 68px;
  flex-shrink: 0;
  padding: 3px 7px;
  border: 1px solid #94a3b8;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  background: #f8fafc;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  /* 스핀버튼 숨김 */
  -moz-appearance: textfield;
}
.lot-input::-webkit-outer-spin-button,
.lot-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.lot-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
}
.lot-end {
  font-size: 14px;
  color: #111827;
  white-space: nowrap;
}

/* 차수별 색상 (입력창 제외) */
.round-1 .lot-num,
.round-1 .lot-name,
.round-1 .lot-end { color: #111827; }

.round-2 .lot-num,
.round-2 .lot-name,
.round-2 .lot-end { color: #ea580c; }

.round-3 .lot-num,
.round-3 .lot-name,
.round-3 .lot-end { color: #16a34a; }

.round-4 .lot-num,
.round-4 .lot-name,
.round-4 .lot-end { color: #7c3aed; }

/* 카운트 셀 */
.td-count { padding: 0; font-weight: 700; }
.td-count--inch   { background: #ffffff; }
.td-count--metric { background: #fff7ed; }

.count-btn {
  display: block;
  width: 100%;
  height: 64px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}
.count-btn:hover { background: rgba(0,0,0,0.06); }
.count-empty { display: block; height: 64px; }

/* 합계 */
.td-total {
  font-weight: 700;
  font-size: 15px;
  color: #0f172a;
  padding: 8px 4px;
}

/* 메뉴 텍스트 버튼 */
.menu-txt-btn {
  background: transparent;
  border: none;
  padding: 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
}
.menu-txt-btn:hover { color: #374151; }

/* ── 다이얼로그 ── */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  padding: 16px;
}
.dialog-box {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
  padding: 24px;
  width: 100%;
  max-width: 300px;
}
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.dialog-company {
  font-weight: 700;
  font-size: 15px;
  color: #0f172a;
  margin: 0;
}
.dialog-area {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0 0;
}
.dialog-close {
  font-size: 13px;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.dialog-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
}
.da-btn {
  flex: 1;
  padding: 13px 8px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  transition: background 0.12s;
  white-space: nowrap;
}
.da-btn--blue   { background: #dbeafe; border-color: #bfdbfe; color: #1e40af; }
.da-btn--blue:hover   { background: #bfdbfe; }
.da-btn--green  { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
.da-btn--green:hover  { background: #bbf7d0; }
.da-btn--purple { background: #ede9fe; border-color: #ddd6fe; color: #5b21b6; }
.da-btn--purple:hover { background: #ddd6fe; }
.da-btn--danger { background: #fee2e2; border-color: #fecaca; color: #b91c1c; }
.da-btn--danger:hover { background: #fecaca; }

@media (max-width: 767px) {
  .qt-summary {
    justify-content: flex-start;
    padding: 0 2px;
    font-size: 16px;
  }

  .qt-scroll {
    display: none;
  }

  .qt-mobile-cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .qt-card {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    padding: 14px;
    cursor: pointer;
  }

  .qt-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .qt-card-title {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    color: #0f172a;
    font-size: 13px;
    line-height: 1.35;
  }

  .qt-card-title strong {
    font-size: 15px;
    line-height: 1.3;
  }

  .qt-card-index,
  .qt-card-date {
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
  }

  .qt-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .qt-card-meta span {
    border-radius: 999px;
    background: #eff6ff;
    padding: 5px 9px;
    color: #1e3a8a;
    font-size: 12px;
    font-weight: 800;
  }

  .qt-card-lot {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    border-radius: 12px;
    background: #f8fafc;
    padding: 9px 10px;
    color: #111827;
    font-size: 12px;
    font-weight: 800;
  }

  .qt-card-lot-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qt-card-lot-num,
  .qt-card-lot span:last-child {
    flex-shrink: 0;
  }

  .qt-card-lot-start {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 800;
  }

  .qt-card-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    border-top: 1px solid #eef2f7;
    padding-top: 12px;
    color: #0f172a;
    font-size: 13px;
    font-weight: 900;
  }

  .qt-card-chevron {
    height: 18px;
    width: 18px;
    transition: transform 0.18s ease;
  }

  .qt-card--open .qt-card-chevron {
    transform: rotate(180deg);
  }

  .qt-card-counts {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.24s ease, opacity 0.18s ease, margin-top 0.18s ease;
    opacity: 0;
  }

  .qt-card--open .qt-card-counts {
    max-height: 150px;
    margin-top: 10px;
    opacity: 1;
  }

  .qt-card-count-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    margin-bottom: 6px;
  }

  .qt-card-count-row:nth-child(2) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    margin-bottom: 0;
  }

  .qt-card-count {
    min-height: 52px;
    border: 1px solid #dbe3ef;
    border-radius: 12px;
    background: #fff;
    padding: 7px 4px;
    color: #0f172a;
    text-align: center;
  }

  .qt-card-count span,
  .qt-card-count strong {
    display: block;
  }

  .qt-card-count span {
    color: #64748b;
    font-size: 10px;
    font-weight: 900;
  }

  .qt-card-count strong {
    margin-top: 3px;
    font-size: 14px;
    font-weight: 900;
  }

  .qt-card-count--metric {
    background: #fff7ed;
    border-color: #fed7aa;
  }
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { QualityCountField } from '../services/quality.service'
import type { QualityListRow } from '../types/quality'

const props = defineProps<{
  items: QualityListRow[]
  loading?: boolean
}>()

const emit = defineEmits<{
  edit: [item: QualityListRow]
  countCheck: [item: QualityListRow]
  delete: [item: QualityListRow]
  moveDate: [item: QualityListRow]
  copyDate: [item: QualityListRow]
  updateRange: [item: QualityListRow, lotStart: number]
  updateCancel: [item: QualityListRow, field: QualityCountField, value: number]
  toggleReturn: [item: QualityListRow, field: QualityCountField, value: boolean]
  moveUp: [index: number]
  moveDown: [index: number]
}>()

const rangeInputs = ref<Record<number, number>>({})

watch(
  () => props.items,
  (items) => {
    rangeInputs.value = items.reduce<Record<number, number>>((acc, item) => {
      acc[item.id] = item.lotNumStartH
      return acc
    }, {})
  },
  { immediate: true },
)

const total = computed(() =>
  props.items.reduce(
    (sum, item) =>
      sum +
      item.a32 +
      item.a40 +
      item.a50 +
      item.a65 +
      item.m65 +
      item.m80 +
      item.m100 +
      item.m125 +
      item.m150 +
      item.m200,
    0,
  ),
)

function promptCancel(item: QualityListRow, field: QualityCountField, currentValue: number) {
  const input = window.prompt(`${field.toUpperCase()} 반납 수량`, String(currentValue))
  if (input == null) return
  const next = Number.parseInt(input, 10)
  emit('updateCancel', item, field, Number.isFinite(next) ? next : 0)
}
</script>

<template>
  <section class="table-panel">
    <div class="table-summary">
      <strong>총합: {{ total }}</strong>
      <span v-if="loading">데이터를 불러오는 중입니다.</span>
    </div>

    <div v-if="loading" class="empty-panel">로딩 중...</div>
    <div v-else-if="items.length === 0" class="empty-panel">검수리스트가 없습니다.</div>
    <div v-else class="table-scroll">
      <table class="quality-table">
        <thead>
          <tr>
            <th>N</th>
            <th>도번</th>
            <th>현장명</th>
            <th>구역명</th>
            <th>확관</th>
            <th>32A</th>
            <th>40A</th>
            <th>50A</th>
            <th>65A</th>
            <th>M65</th>
            <th>M80</th>
            <th>M100</th>
            <th>M125</th>
            <th>M150</th>
            <th>M200</th>
            <th>합계</th>
            <th>메뉴</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="item.id">
            <td>{{ index + 1 }}</td>
            <td>{{ item.initial }}</td>
            <td>{{ item.company }} {{ item.place }}</td>
            <td>{{ item.area }}</td>
            <td>
              <div class="lot-range-cell">
                <div>{{ item.lotNameH || '-' }}</div>
                <div class="lot-range-meta">
                  <input v-model.number="rangeInputs[item.id]" type="number" min="0" />
                  <button type="button" class="tiny-button" @click="emit('updateRange', item, rangeInputs[item.id] ?? 0)">
                    반영
                  </button>
                </div>
              </div>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'a32', item.a32Cancel)">
                {{ item.a32 || '' }}
              </button>
              <label><input :checked="item.a32Return" type="checkbox" @change="emit('toggleReturn', item, 'a32', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'a40', item.a40Cancel)">
                {{ item.a40 || '' }}
              </button>
              <label><input :checked="item.a40Return" type="checkbox" @change="emit('toggleReturn', item, 'a40', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'a50', item.a50Cancel)">
                {{ item.a50 || '' }}
              </button>
              <label><input :checked="item.a50Return" type="checkbox" @change="emit('toggleReturn', item, 'a50', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'a65', item.a65Cancel)">
                {{ item.a65 || '' }}
              </button>
              <label><input :checked="item.a65Return" type="checkbox" @change="emit('toggleReturn', item, 'a65', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'm65', item.m65Cancel)">
                {{ item.m65 || '' }}
              </button>
              <label><input :checked="item.m65Return" type="checkbox" @change="emit('toggleReturn', item, 'm65', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'm80', item.m80Cancel)">
                {{ item.m80 || '' }}
              </button>
              <label><input :checked="item.m80Return" type="checkbox" @change="emit('toggleReturn', item, 'm80', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'm100', item.m100Cancel)">
                {{ item.m100 || '' }}
              </button>
              <label><input :checked="item.m100Return" type="checkbox" @change="emit('toggleReturn', item, 'm100', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'm125', item.m125Cancel)">
                {{ item.m125 || '' }}
              </button>
              <label><input :checked="item.m125Return" type="checkbox" @change="emit('toggleReturn', item, 'm125', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'm150', item.m150Cancel)">
                {{ item.m150 || '' }}
              </button>
              <label><input :checked="item.m150Return" type="checkbox" @change="emit('toggleReturn', item, 'm150', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td class="count-cell">
              <button type="button" class="link-button" @click="promptCancel(item, 'm200', item.m200Cancel)">
                {{ item.m200 || '' }}
              </button>
              <label><input :checked="item.m200Return" type="checkbox" @change="emit('toggleReturn', item, 'm200', ($event.target as HTMLInputElement).checked)" />반납</label>
            </td>
            <td>{{ item.totalH }}</td>
            <td>
              <div class="row-actions">
                <button type="button" class="tiny-button" @click="emit('moveUp', index)" :disabled="index === 0">위</button>
                <button type="button" class="tiny-button" @click="emit('moveDown', index)" :disabled="index === items.length - 1">아래</button>
                <button type="button" class="tiny-button" @click="emit('edit', item)">수정</button>
                <button type="button" class="tiny-button" @click="emit('countCheck', item)">수량</button>
                <button type="button" class="tiny-button" @click="emit('moveDate', item)">이동</button>
                <button type="button" class="tiny-button" @click="emit('copyDate', item)">복사</button>
                <button type="button" class="tiny-button danger" @click="emit('delete', item)">삭제</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
